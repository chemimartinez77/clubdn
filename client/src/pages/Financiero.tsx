// client/src/pages/Financiero.tsx
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

type ViewMode = 'balance' | 'movements' | 'categories';

export default function Financiero() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>('balance');

  const years = [2023, 2024, 2025];
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  // Datos de ejemplo - categorías de gastos
  const categories = [
    { name: 'Alquiler', icon: '🏠', color: 'bg-blue-100 text-blue-800' },
    { name: 'Luz', icon: '⚡', color: 'bg-yellow-100 text-yellow-800' },
    { name: 'Agua', icon: '💧', color: 'bg-cyan-100 text-cyan-800' },
    { name: 'Internet', icon: '🌐', color: 'bg-purple-100 text-purple-800' },
    { name: 'Limpieza', icon: '🧹', color: 'bg-green-100 text-green-800' },
    { name: 'Seguro', icon: '🛡️', color: 'bg-orange-100 text-orange-800' },
    { name: 'Compra', icon: '🛒', color: 'bg-pink-100 text-pink-800' },
    { name: 'Extintores', icon: '🧯', color: 'bg-red-100 text-red-800' },
    { name: 'IRPF', icon: '📋', color: 'bg-indigo-100 text-indigo-800' },
    { name: 'Obras', icon: '🔨', color: 'bg-amber-100 text-amber-800' },
    { name: 'Material', icon: '📦', color: 'bg-teal-100 text-teal-800' },
    { name: 'Mobiliario', icon: '🪑', color: 'bg-lime-100 text-lime-800' },
    { name: 'Gastos Bancarios', icon: '🏦', color: 'bg-slate-100 text-slate-800' },
    { name: 'Juegos', icon: '🎲', color: 'bg-rose-100 text-rose-800' },
    { name: 'Servicios Online', icon: '💻', color: 'bg-violet-100 text-violet-800' }
  ];

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
                  <p className="text-2xl font-bold text-green-600">0,00 €</p>
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
                  <p className="text-2xl font-bold text-red-600">0,00 €</p>
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
                  <p className="text-2xl font-bold text-[var(--color-text)]">0,00 €</p>
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
                  <p className="text-2xl font-bold text-[var(--color-text)]">0</p>
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
                    {categories.map((category, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-[var(--color-tableRowHover)]' : 'bg-[var(--color-cardBackground)]'}>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                            <span>{category.icon}</span>
                            {category.name}
                          </span>
                        </td>
                        {months.map((_, monthIdx) => (
                          <td key={monthIdx} className="text-center py-3 px-2 text-[var(--color-textSecondary)] text-sm">-</td>
                        ))}
                        <td className="text-right py-3 px-4 font-medium text-[var(--color-text)]">0,00 €</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--color-inputBorder)] bg-[var(--color-tableRowHover)]">
                      <td className="py-3 px-4 font-bold text-[var(--color-text)]">TOTAL</td>
                      {months.map((_, idx) => (
                        <td key={idx} className="text-center py-3 px-2 font-bold text-[var(--color-text)] text-sm">0€</td>
                      ))}
                      <td className="text-right py-3 px-4 font-bold text-[var(--color-text)]">0,00 €</td>
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
                <CardTitle>Movimientos</CardTitle>
                <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors">
                  Añadir Movimiento
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-[var(--color-textSecondary)]">
                <svg className="w-16 h-16 mx-auto mb-4 text-[var(--color-textSecondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-lg">No hay movimientos registrados</p>
                <p className="text-sm mt-2">Comienza añadiendo tu primer ingreso o gasto</p>
              </div>
            </CardContent>
          </Card>
        )}

        {viewMode === 'categories' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gestión de Categorías</CardTitle>
                <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors">
                  Nueva Categoría
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category, idx) => (
                  <div key={idx} className="border border-[var(--color-cardBorder)] rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                        <span className="text-lg">{category.icon}</span>
                        {category.name}
                      </span>
                      <button className="text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-[var(--color-textSecondary)]">
                      <p>Total {selectedYear}: <span className="font-semibold text-[var(--color-text)]">0,00 €</span></p>
                      <p className="mt-1">0 transacciones</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

