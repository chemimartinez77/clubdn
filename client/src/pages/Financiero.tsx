// client/src/pages/Financiero.tsx
import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { api } from '../api/axios';

type ViewMode = 'balance' | 'movements' | 'categories';

interface FinancialCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  showInBalance: boolean;
  createdAt: string;
  updatedAt: string;
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
}

interface BalanceCategoryData {
  category: {
    id: string;
    name: string;
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

export default function Financiero() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState<ViewMode>('balance');

  // State para datos
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

  // State para modales
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // State para formularios
  const [movementForm, setMovementForm] = useState({
    categoryId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '💰',
    color: 'bg-blue-100 text-blue-800'
  });

  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  // Cargar categorías
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

  // Cargar movimientos
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

  // Cargar balance anual
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

  // Cargar estadísticas
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

  // Crear movimiento
  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/api/financial/movements', movementForm);
      if (response.data.success) {
        setShowMovementModal(false);
        setMovementForm({
          categoryId: '',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        await Promise.all([loadMovements(), loadBalance(), loadStatistics()]);
      }
    } catch (error) {
      console.error('Error creating movement:', error);
      alert('Error al crear el movimiento');
    } finally {
      setLoading(false);
    }
  };

  // Crear categoría
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/api/financial/categories', categoryForm);
      if (response.data.success) {
        setShowCategoryModal(false);
        setCategoryForm({
          name: '',
          icon: '💰',
          color: 'bg-blue-100 text-blue-800'
        });
        await loadCategories();
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Error al crear la categoría');
    } finally {
      setLoading(false);
    }
  };

  // Toggle showInBalance
  const handleToggleShowInBalance = async (categoryId: string, currentValue: boolean) => {
    try {
      const response = await api.put(`/api/financial/categories/${categoryId}`, {
        showInBalance: !currentValue
      });
      if (response.data.success) {
        await Promise.all([loadCategories(), loadBalance()]);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error al actualizar la categoría');
    }
  };

  // Efectos
  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadMovements();
    loadBalance();
    loadStatistics();
  }, [selectedYear]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Gestión Financiera</h1>
            <p className="text-[var(--color-textSecondary)] mt-1">Control de ingresos y gastos del club</p>
          </div>

          {/* Selector de año */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Tabs de navegación */}
        <div className="border-b border-[var(--color-cardBorder)]">
          <nav className="flex space-x-8">
            <button
              onClick={() => setViewMode('balance')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                viewMode === 'balance'
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)] hover:border-[var(--color-inputBorder)]'
              }`}
            >
              Balance Anual
            </button>
            <button
              onClick={() => setViewMode('movements')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                viewMode === 'movements'
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)] hover:border-[var(--color-inputBorder)]'
              }`}
            >
              Movimientos
            </button>
            <button
              onClick={() => setViewMode('categories')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                viewMode === 'categories'
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)] hover:border-[var(--color-inputBorder)]'
              }`}
            >
              Categorías
            </button>
          </nav>
        </div>

        {/* Resumen de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.totalIncomes.toFixed(2)} €</p>
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
                  <p className="text-2xl font-bold text-red-600">{statistics.totalExpenses.toFixed(2)} €</p>
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
                    {statistics.balance.toFixed(2)} €
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

        {/* Contenido según la vista seleccionada */}
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
                      {months.map(month => (
                        <th key={month} className="text-center py-3 px-2 font-semibold text-[var(--color-textSecondary)] text-sm">{month}</th>
                      ))}
                      <th className="text-right py-3 px-4 font-semibold text-[var(--color-textSecondary)]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceData?.categories.map((categoryData, idx) => (
                      <tr key={categoryData.category.id} className={idx % 2 === 0 ? 'bg-[var(--color-tableRowHover)]' : 'bg-[var(--color-cardBackground)]'}>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${categoryData.category.color}`}>
                            <span>{categoryData.category.icon}</span>
                            {categoryData.category.name}
                          </span>
                        </td>
                        {categoryData.monthlyTotals.map((amount, monthIdx) => (
                          <td key={monthIdx} className="text-center py-3 px-2 text-[var(--color-textSecondary)] text-sm">
                            {amount !== 0 ? `${amount.toFixed(0)}€` : '-'}
                          </td>
                        ))}
                        <td className="text-right py-3 px-4 font-medium text-[var(--color-text)]">
                          {categoryData.totalYear.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--color-inputBorder)] bg-[var(--color-tableRowHover)]">
                      <td className="py-3 px-4 font-bold text-[var(--color-text)]">TOTAL</td>
                      {balanceData?.monthlyTotals.map((amount, idx) => (
                        <td key={idx} className="text-center py-3 px-2 font-bold text-[var(--color-text)] text-sm">
                          {amount !== 0 ? `${amount.toFixed(0)}€` : '-'}
                        </td>
                      ))}
                      <td className="text-right py-3 px-4 font-bold text-[var(--color-text)]">
                        {balanceData?.totalYear.toFixed(2) || '0.00'} €
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
                  onClick={() => setShowMovementModal(true)}
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${movement.category.color}`}>
                            <span>{movement.category.icon}</span>
                            {movement.category.name}
                          </span>
                          <div className="flex-1">
                            <p className="text-[var(--color-text)] font-medium">
                              {movement.description || 'Sin descripción'}
                            </p>
                            <p className="text-sm text-[var(--color-textSecondary)]">
                              {new Date(movement.date).toLocaleDateString('es-ES')} • {movement.user.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${movement.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {movement.amount >= 0 ? '+' : ''}{movement.amount.toFixed(2)} €
                          </p>
                        </div>
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
                  onClick={() => setShowCategoryModal(true)}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors"
                >
                  Nueva Categoría
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => {
                  const categoryMovements = movements.filter(m => m.categoryId === category.id);
                  const categoryTotal = categoryMovements.reduce((sum, m) => sum + m.amount, 0);

                  return (
                    <div key={category.id} className="border border-[var(--color-cardBorder)] rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                          <span className="text-lg">{category.icon}</span>
                          {category.name}
                        </span>
                      </div>
                      <div className="text-sm text-[var(--color-textSecondary)] mb-3">
                        <p>Total {selectedYear}: <span className="font-semibold text-[var(--color-text)]">{categoryTotal.toFixed(2)} €</span></p>
                        <p className="mt-1">{categoryMovements.length} transacciones</p>
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
            </CardContent>
          </Card>
        )}

        {/* Modal Añadir Movimiento */}
        {showMovementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-cardBackground)] rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-text)]">Añadir Movimiento</h2>
                <button
                  onClick={() => setShowMovementModal(false)}
                  className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateMovement} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Categoría *
                  </label>
                  <select
                    required
                    value={movementForm.categoryId}
                    onChange={(e) => setMovementForm({ ...movementForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={movementForm.date}
                    onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Cantidad * (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={movementForm.amount}
                    onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                    placeholder="Ej: 100.00 (positivo) o -50.00 (negativo)"
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                    Usa valores positivos para ingresos y negativos para gastos
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={movementForm.description}
                    onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
                    placeholder="Descripción del movimiento (opcional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowMovementModal(false)}
                    className="flex-1 px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Nueva Categoría */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-cardBackground)] rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--color-text)]">Nueva Categoría</h2>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Nombre *
                  </label>
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
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Icono *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    placeholder="Ej: 🔧"
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                    Usa un emoji representativo
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Color *
                  </label>
                  <select
                    required
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  >
                    <option value="bg-blue-100 text-blue-800">Azul</option>
                    <option value="bg-green-100 text-green-800">Verde</option>
                    <option value="bg-yellow-100 text-yellow-800">Amarillo</option>
                    <option value="bg-red-100 text-red-800">Rojo</option>
                    <option value="bg-purple-100 text-purple-800">Púrpura</option>
                    <option value="bg-pink-100 text-pink-800">Rosa</option>
                    <option value="bg-indigo-100 text-indigo-800">Índigo</option>
                    <option value="bg-orange-100 text-orange-800">Naranja</option>
                    <option value="bg-cyan-100 text-cyan-800">Cian</option>
                    <option value="bg-teal-100 text-teal-800">Verde azulado</option>
                    <option value="bg-lime-100 text-lime-800">Lima</option>
                    <option value="bg-amber-100 text-amber-800">Ámbar</option>
                    <option value="bg-emerald-100 text-emerald-800">Esmeralda</option>
                    <option value="bg-violet-100 text-violet-800">Violeta</option>
                    <option value="bg-rose-100 text-rose-800">Rosa oscuro</option>
                    <option value="bg-slate-100 text-slate-800">Pizarra</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="flex-1 px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

