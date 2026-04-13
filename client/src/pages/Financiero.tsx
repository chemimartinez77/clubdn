import { Fragment, useEffect, useRef, useState } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { api } from '../api/axios';

type ViewMode = 'balance' | 'movements' | 'categories';
type FinancialCategoryType = 'GASTO' | 'INGRESO';
type FinancialAttachmentType = 'IMAGE' | 'PDF';

interface FinancialCategory {
  id: string;
  name: string;
  type: FinancialCategoryType;
  icon: string;
  color: string;
  showInBalance: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    movements: number;
  };
}

interface FinancialMovementAttachment {
  id: string;
  url: string;
  fileType: FinancialAttachmentType;
  fileName: string;
  createdAt: string;
}

interface FinancialMovement {
  id: string;
  categoryId: string;
  category: FinancialCategory;
  amount: number;
  description: string | null;
  date: string;
  year: number;
  month: number;
  createdBy: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  attachments: FinancialMovementAttachment[];
}

interface BalanceCategoryData {
  category: {
    id: string;
    name: string;
    type: FinancialCategoryType;
    icon: string;
    color: string;
  };
  monthlyTotals: number[];
  totalYear: number;
  transactionCount: number;
}

interface BalanceResponse {
  year: number;
  categories: BalanceCategoryData[];
  monthlyTotals: number[];
  totalYear: number;
}

interface Statistics {
  year: number;
  totalMovements: number;
  totalIncomes: number;
  totalExpenses: number;
  balance: number;
}

interface CategoryFormState {
  name: string;
  type: FinancialCategoryType;
  icon: string;
}

interface MovementFormState {
  categoryId: string;
  amount: string;
  description: string;
  date: string;
}

interface AttachmentDraft {
  id: string;
  name: string;
  fileType: FinancialAttachmentType;
  url: string;
  existing: boolean;
  file?: File;
}

const MAX_ATTACHMENTS = 3;

const createEmptyMovementForm = (): MovementFormState => ({
  categoryId: '',
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0]
});

const createEmptyCategoryForm = (): CategoryFormState => ({
  name: '',
  type: 'GASTO',
  icon: '💰'
});

const fileToAttachmentDraft = (file: File): AttachmentDraft | null => {
  if (file.type.startsWith('image/')) {
    return {
      id: `new-${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      fileType: 'IMAGE',
      url: URL.createObjectURL(file),
      existing: false,
      file
    };
  }

  if (file.type === 'application/pdf') {
    return {
      id: `new-${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      fileType: 'PDF',
      url: '',
      existing: false,
      file
    };
  }

  return null;
};

const attachmentFromApi = (attachment: FinancialMovementAttachment): AttachmentDraft => ({
  id: attachment.id,
  name: attachment.fileName,
  fileType: attachment.fileType,
  url: attachment.url,
  existing: true
});

const revokeDraftUrl = (attachment: AttachmentDraft) => {
  if (!attachment.existing && attachment.fileType === 'IMAGE' && attachment.url) {
    URL.revokeObjectURL(attachment.url);
  }
};

const formatCurrency = (amount: number) => `${amount.toFixed(2)} €`;

export default function Financiero() {
  const currentYear = new Date().getFullYear();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsRef = useRef<AttachmentDraft[]>([]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState<ViewMode>('balance');
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [movements, setMovements] = useState<FinancialMovement[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceResponse | null>(null);
  const [statistics, setStatistics] = useState<Statistics>({
    year: currentYear,
    totalMovements: 0,
    totalIncomes: 0,
    totalExpenses: 0,
    balance: 0
  });

  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategoryTypeConfirm, setShowCategoryTypeConfirm] = useState(false);
  const [editingMovement, setEditingMovement] = useState<FinancialMovement | null>(null);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [pendingCategorySubmit, setPendingCategorySubmit] = useState<CategoryFormState | null>(null);
  const [deletingMovementId, setDeletingMovementId] = useState<string | null>(null);

  const [movementForm, setMovementForm] = useState<MovementFormState>(createEmptyMovementForm());
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(createEmptyCategoryForm());
  const [movementAttachments, setMovementAttachments] = useState<AttachmentDraft[]>([]);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  const cleanupDrafts = (attachments: AttachmentDraft[]) => {
    attachments.forEach(revokeDraftUrl);
  };

  const resetMovementEditor = () => {
    cleanupDrafts(movementAttachments);
    setMovementAttachments([]);
    setMovementForm(createEmptyMovementForm());
    setEditingMovement(null);
    setShowMovementModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetCategoryEditor = () => {
    setCategoryForm(createEmptyCategoryForm());
    setEditingCategory(null);
    setPendingCategorySubmit(null);
    setShowCategoryModal(false);
    setShowCategoryTypeConfirm(false);
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/api/financial/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadMovements = async () => {
    try {
      const response = await api.get(`/api/financial/movements?year=${selectedYear}`);
      if (response.data.success) {
        setMovements(response.data.data);
      }
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await api.get(`/api/financial/balance?year=${selectedYear}`);
      if (response.data.success) {
        setBalanceData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get(`/api/financial/statistics?year=${selectedYear}`);
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadMovements();
    loadBalance();
    loadStatistics();
  }, [selectedYear]);

  useEffect(() => {
    attachmentsRef.current = movementAttachments;
  }, [movementAttachments]);

  useEffect(() => () => {
    cleanupDrafts(attachmentsRef.current);
  }, []);

  const addAttachments = (files: FileList | File[]) => {
    const drafts = Array.from(files)
      .map(fileToAttachmentDraft)
      .filter((draft): draft is AttachmentDraft => Boolean(draft));

    if (drafts.length === 0) {
      alert('Solo puedes adjuntar imágenes o archivos PDF');
      return;
    }

    const availableSlots = MAX_ATTACHMENTS - movementAttachments.length;
    if (availableSlots <= 0) {
      drafts.forEach(revokeDraftUrl);
      alert(`Solo se permiten hasta ${MAX_ATTACHMENTS} adjuntos por movimiento`);
      return;
    }

    const accepted = drafts.slice(0, availableSlots);
    const rejected = drafts.slice(availableSlots);
    rejected.forEach(revokeDraftUrl);

    setMovementAttachments((prev) => [...prev, ...accepted]);

    if (drafts.length > availableSlots) {
      alert(`Solo se han añadido ${availableSlots} adjuntos para mantener el límite de ${MAX_ATTACHMENTS}`);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setMovementAttachments((prev) => {
      const target = prev.find((item) => item.id === attachmentId);
      if (target) {
        revokeDraftUrl(target);
      }
      return prev.filter((item) => item.id !== attachmentId);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openCreateMovementModal = () => {
    resetMovementEditor();
    setShowMovementModal(true);
  };

  const handleEditMovement = (movement: FinancialMovement) => {
    cleanupDrafts(movementAttachments);
    setEditingMovement(movement);
    setMovementForm({
      categoryId: movement.categoryId,
      amount: String(movement.amount),
      description: movement.description || '',
      date: movement.date.split('T')[0]
    });
    setMovementAttachments(movement.attachments.map(attachmentFromApi));
    setShowMovementModal(true);
  };

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('categoryId', movementForm.categoryId);
      formData.append('amount', movementForm.amount);
      formData.append('description', movementForm.description);
      formData.append('date', movementForm.date);

      movementAttachments.forEach((attachment) => {
        if (attachment.existing) {
          formData.append('keepAttachmentIds', attachment.id);
        } else if (attachment.file) {
          formData.append('attachments', attachment.file);
        }
      });

      if (editingMovement) {
        await api.put(`/api/financial/movements/${editingMovement.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/api/financial/movements', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      resetMovementEditor();
      await Promise.all([loadMovements(), loadBalance(), loadStatistics(), loadCategories()]);
    } catch (error) {
      console.error('Error saving movement:', error);
      alert('Error al guardar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMovement = async (id: string) => {
    setLoading(true);
    try {
      await api.delete(`/api/financial/movements/${id}`);
      setDeletingMovementId(null);
      await Promise.all([loadMovements(), loadBalance(), loadStatistics(), loadCategories()]);
    } catch (error) {
      console.error('Error deleting movement:', error);
      alert('Error al eliminar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const openCreateCategoryModal = () => {
    resetCategoryEditor();
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category: FinancialCategory) => {
    resetCategoryEditor();
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      type: category.type,
      icon: category.icon
    });
    setShowCategoryModal(true);
  };

  const saveCategory = async (formState: CategoryFormState) => {
    setLoading(true);
    try {
      if (editingCategory) {
        await api.put(`/api/financial/categories/${editingCategory.id}`, formState);
      } else {
        await api.post('/api/financial/categories', formState);
      }

      resetCategoryEditor();
      await Promise.all([loadCategories(), loadMovements(), loadBalance(), loadStatistics()]);
    } catch (error) {
      console.error('Error saving category:', error);
      alert(editingCategory ? 'Error al actualizar la categoría' : 'Error al crear la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      editingCategory &&
      editingCategory.type !== categoryForm.type &&
      (editingCategory._count?.movements ?? 0) > 0
    ) {
      setPendingCategorySubmit(categoryForm);
      setShowCategoryTypeConfirm(true);
      return;
    }

    await saveCategory(categoryForm);
  };

  const confirmCategoryTypeChange = async () => {
    if (!pendingCategorySubmit) {
      setShowCategoryTypeConfirm(false);
      return;
    }

    setShowCategoryTypeConfirm(false);
    await saveCategory(pendingCategorySubmit);
  };

  const handleToggleShowInBalance = async (categoryId: string, currentValue: boolean) => {
    try {
      await api.put(`/api/financial/categories/${categoryId}`, {
        showInBalance: !currentValue
      });
      await Promise.all([loadCategories(), loadBalance()]);
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error al actualizar la categoría');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Gestión Financiera</h1>
            <p className="text-[var(--color-textSecondary)] mt-1">Control de ingresos y gastos del club</p>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="border-b border-[var(--color-cardBorder)]">
          <nav className="flex space-x-8">
            {[
              ['balance', 'Balance Anual'],
              ['movements', 'Movimientos'],
              ['categories', 'Categorías']
            ].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as ViewMode)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  viewMode === mode
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)] hover:border-[var(--color-inputBorder)]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(statistics.totalIncomes)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Gastos Totales</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(statistics.totalExpenses)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Balance</p>
                  <p className={`text-2xl font-bold ${statistics.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {statistics.balance >= 0 ? '+' : ''}
                    {formatCurrency(statistics.balance)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Transacciones</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">{statistics.totalMovements}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {viewMode === 'balance' && (
          <Card>
            <CardHeader>
              <CardTitle>Balance por Categorías - {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--color-cardBorder)]">
                      <th className="text-left py-3 px-4 font-semibold text-[var(--color-textSecondary)]">Categoría</th>
                      {months.map((month) => (
                        <th key={month} className="text-center py-3 px-2 font-semibold text-[var(--color-textSecondary)] text-sm">{month}</th>
                      ))}
                      <th className="text-right py-3 px-4 font-semibold text-[var(--color-textSecondary)]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['INGRESO', 'GASTO'] as const).map((tipo) => {
                      const group = balanceData?.categories.filter((item) => item.category.type === tipo) ?? [];
                      if (group.length === 0) return null;

                      const groupTotal = group.reduce((sum, item) => sum + item.totalYear, 0);
                      const groupMonthly = Array(12).fill(0).map((_, index) =>
                        group.reduce((sum, item) => sum + item.monthlyTotals[index], 0)
                      );

                      return (
                        <Fragment key={tipo}>
                          <tr>
                            <td colSpan={14} className={`py-2 px-4 text-xs font-semibold uppercase tracking-wide ${tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                              {tipo === 'INGRESO' ? 'Ingresos' : 'Gastos'}
                            </td>
                          </tr>
                          {group.map((categoryData, index) => (
                            <tr key={categoryData.category.id} className={index % 2 === 0 ? 'bg-[var(--color-tableRowHover)]' : 'bg-[var(--color-cardBackground)]'}>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${categoryData.category.color}`}>
                                  <span>{categoryData.category.icon}</span>
                                  {categoryData.category.name}
                                </span>
                              </td>
                              {categoryData.monthlyTotals.map((amount, monthIndex) => (
                                <td key={monthIndex} className="text-center py-3 px-2 text-[var(--color-textSecondary)] text-sm">
                                  {amount !== 0 ? `${amount.toFixed(0)}€` : '-'}
                                </td>
                              ))}
                              <td className="text-right py-3 px-4 font-medium text-[var(--color-text)]">
                                {formatCurrency(categoryData.totalYear)}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-[var(--color-cardBorder)]">
                            <td className={`py-2 px-4 text-sm font-semibold ${tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                              Subtotal {tipo === 'INGRESO' ? 'ingresos' : 'gastos'}
                            </td>
                            {groupMonthly.map((amount, index) => (
                              <td key={index} className={`text-center py-2 px-2 text-sm font-semibold ${tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                                {amount !== 0 ? `${amount.toFixed(0)}€` : '-'}
                              </td>
                            ))}
                            <td className={`text-right py-2 px-4 text-sm font-semibold ${tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(groupTotal)}
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--color-inputBorder)] bg-[var(--color-tableRowHover)]">
                      <td className="py-3 px-4 font-bold text-[var(--color-text)]">TOTAL</td>
                      {balanceData?.monthlyTotals.map((amount, index) => (
                        <td key={index} className={`text-center py-3 px-2 font-bold text-sm ${amount > 0 ? 'text-green-600' : amount < 0 ? 'text-red-600' : 'text-[var(--color-text)]'}`}>
                          {amount !== 0 ? `${amount > 0 ? '+' : ''}${amount.toFixed(0)}€` : '-'}
                        </td>
                      ))}
                      <td className={`text-right py-3 px-4 font-bold ${(balanceData?.totalYear ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(balanceData?.totalYear ?? 0) >= 0 ? '+' : ''}
                        {formatCurrency(balanceData?.totalYear ?? 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {viewMode === 'movements' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Movimientos - {selectedYear}</CardTitle>
                <button
                  onClick={openCreateMovementModal}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors"
                >
                  Añadir Movimiento
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-textSecondary)]">
                  <svg className="w-16 h-16 mx-auto mb-4 text-[var(--color-textSecondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-lg">No hay movimientos registrados</p>
                  <p className="text-sm mt-2">Comienza añadiendo tu primer ingreso o gasto</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {movements.map((movement) => (
                    <div key={movement.id} className="border border-[var(--color-cardBorder)] rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <span className={`shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${movement.category.color}`}>
                              <span>{movement.category.icon}</span>
                              {movement.category.name}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[var(--color-text)] font-medium">
                                {movement.description || 'Sin descripción'}
                              </p>
                              <p className="text-sm text-[var(--color-textSecondary)]">
                                {new Date(movement.date).toLocaleDateString('es-ES')} • {movement.user.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <p className={`text-lg font-bold ${movement.category.type === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(movement.amount)}
                            </p>
                            <button
                              onClick={() => handleEditMovement(movement)}
                              className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {deletingMovementId === movement.id ? (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-[var(--color-textSecondary)]">¿Eliminar?</span>
                                <button
                                  onClick={() => setDeletingMovementId(null)}
                                  className="px-1.5 py-0.5 border border-[var(--color-inputBorder)] rounded text-[var(--color-textSecondary)]"
                                >
                                  No
                                </button>
                                <button
                                  onClick={() => handleDeleteMovement(movement.id)}
                                  disabled={loading}
                                  className="px-1.5 py-0.5 bg-red-500 text-white rounded disabled:opacity-50"
                                >
                                  Sí
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingMovementId(movement.id)}
                                className="p-1.5 text-[var(--color-textSecondary)] hover:text-red-500 transition-colors"
                                title="Eliminar"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {movement.attachments.length > 0 && (
                          <div className="pl-0 md:pl-16 flex flex-wrap gap-3">
                            {movement.attachments.map((attachment) => (
                              attachment.fileType === 'IMAGE' ? (
                                <a
                                  key={attachment.id}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={attachment.url}
                                    alt={attachment.fileName}
                                    className="h-24 w-24 rounded-lg object-cover border border-[var(--color-cardBorder)] hover:opacity-90 transition-opacity"
                                  />
                                </a>
                              ) : (
                                <a
                                  key={attachment.id}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] hover:border-[var(--color-primary)] transition-colors max-w-sm"
                                >
                                  <span className="text-red-600 font-bold text-sm">PDF</span>
                                  <span className="text-sm text-[var(--color-text)] truncate">{attachment.fileName}</span>
                                </a>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {viewMode === 'categories' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gestión de Categorías</CardTitle>
                <button
                  onClick={openCreateCategoryModal}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors"
                >
                  Nueva Categoría
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {(['INGRESO', 'GASTO'] as const).map((tipo) => {
                const filtered = categories.filter((category) => category.type === tipo);
                if (filtered.length === 0) return null;

                return (
                  <div key={tipo}>
                    <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                      {tipo === 'INGRESO' ? 'Ingresos' : 'Gastos'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map((category) => {
                        const categoryTotal = movements
                          .filter((movement) => movement.categoryId === category.id)
                          .reduce((sum, movement) => sum + movement.amount, 0);

                        return (
                          <div key={category.id} className="border border-[var(--color-cardBorder)] rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                                <span className="text-lg">{category.icon}</span>
                                {category.name}
                              </span>
                              <button
                                onClick={() => openEditCategoryModal(category)}
                                className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors"
                                title="Editar categoría"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                            <div className="text-sm text-[var(--color-textSecondary)] mb-3">
                              <p>Total {selectedYear}: <span className="font-semibold text-[var(--color-text)]">{formatCurrency(categoryTotal)}</span></p>
                              <p className="mt-1">{category._count?.movements ?? 0} transacciones totales</p>
                            </div>
                            <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-cardBorder)]">
                              <input
                                type="checkbox"
                                id={`show-${category.id}`}
                                checked={category.showInBalance}
                                onChange={() => handleToggleShowInBalance(category.id, category.showInBalance)}
                                className="w-4 h-4 text-[var(--color-primary)] bg-gray-100 border-gray-300 rounded focus:ring-[var(--color-primary)] focus:ring-2"
                              />
                              <label htmlFor={`show-${category.id}`} className="text-sm text-[var(--color-textSecondary)] cursor-pointer">
                                Mostrar en balance
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {showMovementModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-cardBackground)] rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-text)]">
                  {editingMovement ? 'Editar Movimiento' : 'Añadir Movimiento'}
                </h2>
                <button onClick={resetMovementEditor} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={submitMovement} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Categoría *</label>
                  <select
                    required
                    value={movementForm.categoryId}
                    onChange={(e) => setMovementForm({ ...movementForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Fecha *</label>
                    <input
                      type="date"
                      required
                      value={movementForm.date}
                      onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Cantidad * (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={movementForm.amount}
                      onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                      placeholder="Ej: 90.00"
                      className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Descripción</label>
                  <textarea
                    value={movementForm.description}
                    onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
                    placeholder="Descripción del movimiento (opcional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <label className="block text-sm font-medium text-[var(--color-text)]">
                      Adjuntos ({movementAttachments.length}/{MAX_ATTACHMENTS})
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={movementAttachments.length >= MAX_ATTACHMENTS}
                      className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-inputBorder)] hover:bg-[var(--color-tableRowHover)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Añadir archivos
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        addAttachments(e.target.files);
                      }
                      e.target.value = '';
                    }}
                  />
                  <p className="text-xs text-[var(--color-textSecondary)] mb-3">
                    Puedes adjuntar hasta 3 imágenes o PDFs.
                  </p>

                  {movementAttachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {movementAttachments.map((attachment) => (
                        <div key={attachment.id} className="relative border border-[var(--color-cardBorder)] rounded-lg overflow-hidden bg-[var(--color-tableRowHover)]">
                          {attachment.fileType === 'IMAGE' ? (
                            <div className="relative">
                              <img src={attachment.url} alt={attachment.name} className="h-28 w-full object-cover" />
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0"
                                aria-label={`Abrir ${attachment.name}`}
                              />
                            </div>
                          ) : (
                            <div className="h-28 flex flex-col items-center justify-center px-4 text-center">
                              <span className="text-red-600 font-bold text-lg">PDF</span>
                              <span className="text-sm text-[var(--color-text)] break-words">{attachment.name}</span>
                            </div>
                          )}
                          <div className="p-3 border-t border-[var(--color-cardBorder)] flex items-center justify-between gap-2">
                            <span className="text-xs text-[var(--color-textSecondary)] truncate">
                              {attachment.existing ? 'Adjunto guardado' : 'Nuevo adjunto'}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(attachment.id)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetMovementEditor}
                    className="flex-1 px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : editingMovement ? 'Guardar cambios' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-cardBackground)] rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-text)]">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </h2>
                <button onClick={resetCategoryEditor} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Tipo *</label>
                  <select
                    required
                    value={categoryForm.type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as FinancialCategoryType })}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  >
                    <option value="GASTO">Gasto</option>
                    <option value="INGRESO">Ingreso</option>
                  </select>
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                    El color se asigna automáticamente: rojo para gastos y verde para ingresos.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Ej: Mantenimiento"
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Icono *</label>
                  <input
                    type="text"
                    required
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    placeholder="Ej: 🔧"
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">Usa un emoji representativo.</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetCategoryEditor}
                    className="flex-1 px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : editingCategory ? 'Guardar cambios' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCategoryTypeConfirm && editingCategory && pendingCategorySubmit && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-cardBackground)] rounded-lg shadow-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">Cambiar tipo de categoría</h2>
              <p className="text-sm text-[var(--color-textSecondary)] leading-relaxed">
                Esta categoría ya tiene {editingCategory._count?.movements ?? 0} movimientos registrados.
                Si cambias su tipo de {editingCategory.type === 'GASTO' ? 'gasto' : 'ingreso'} a {pendingCategorySubmit.type === 'GASTO' ? 'gasto' : 'ingreso'},
                sus movimientos pasarán a verse con el nuevo tipo en listados, balance y estadísticas.
              </p>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryTypeConfirm(false);
                    setPendingCategorySubmit(null);
                  }}
                  className="flex-1 px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmCategoryTypeChange}
                  className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors"
                >
                  Confirmar cambio
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
