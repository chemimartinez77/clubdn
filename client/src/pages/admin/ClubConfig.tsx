// client/src/pages/admin/ClubConfig.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { api } from '../../api/axios';
import type { ClubConfig, ClubConfigUpdate, MembershipTypeConfig } from '../../types/config';
import type { ApiResponse } from '../../types/auth';

export default function ClubConfigPage() {
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ClubConfigUpdate>({});
  const [membershipTypes, setMembershipTypes] = useState<MembershipTypeConfig[]>([]);

  const { data: config, isLoading } = useQuery({
    queryKey: ['clubConfig'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ClubConfig>>('/api/config');
      return response.data.data;
    }
  });

  // Actualizar formulario cuando se carga la config
  useEffect(() => {
    if (config) {
      setFormData({
        clubName: config.clubName,
        clubEmail: config.clubEmail,
        clubPhone: config.clubPhone,
        clubAddress: config.clubAddress,
        defaultCurrency: config.defaultCurrency
      });
      setMembershipTypes(config.membershipTypes);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (data: ClubConfigUpdate) => {
      const response = await api.put<ApiResponse<ClubConfig>>('/api/config', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clubConfig'] });
      success(data.message || 'Configuración actualizada correctamente');
      setIsEditing(false);
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al actualizar la configuración');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      membershipTypes
    });
  };

  const handleMembershipTypeChange = (index: number, field: keyof MembershipTypeConfig, value: string | number | boolean) => {
    const updated = [...membershipTypes];
    updated[index] = { ...updated[index], [field]: value };
    setMembershipTypes(updated);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuración del Club</h1>
            <p className="text-gray-600 mt-1">Gestiona los ajustes generales y tipos de membresía</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="primary">
              Editar Configuración
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(false)} variant="outline">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} variant="primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          )}
        </div>

        {/* Información General del Club */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Club
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.clubName || ''}
                    onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{config?.clubName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de Contacto
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.clubEmail || ''}
                    onChange={(e) => setFormData({ ...formData, clubEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    placeholder="email@clubdn.com"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{config?.clubEmail || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.clubPhone || ''}
                    onChange={(e) => setFormData({ ...formData, clubPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    placeholder="+34 XXX XXX XXX"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{config?.clubPhone || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda
                </label>
                {isEditing ? (
                  <select
                    value={formData.defaultCurrency || 'EUR'}
                    onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                ) : (
                  <p className="text-gray-900 py-2">{config?.defaultCurrency}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.clubAddress || ''}
                    onChange={(e) => setFormData({ ...formData, clubAddress: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                    placeholder="Dirección completa del club"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{config?.clubAddress || '-'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tipos de Membresía */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Membresía</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {membershipTypes.map((type, index) => (
                <div key={type.type} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo
                      </label>
                      <p className="text-gray-900 py-2 font-medium">{type.type}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre a Mostrar
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={type.displayName}
                          onChange={(e) => handleMembershipTypeChange(index, 'displayName', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900 py-2">{type.displayName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio Mensual (€)
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={type.price}
                          onChange={(e) => handleMembershipTypeChange(index, 'price', parseFloat(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900 py-2">{type.price}€</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tiene Llave
                      </label>
                      {isEditing ? (
                        <label className="flex items-center py-2">
                          <input
                            type="checkbox"
                            checked={type.hasKey}
                            onChange={(e) => handleMembershipTypeChange(index, 'hasKey', e.target.checked)}
                            className="w-4 h-4 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                          />
                          <span className="ml-2 text-gray-900">Sí</span>
                        </label>
                      ) : (
                        <p className="text-gray-900 py-2">{type.hasKey ? 'Sí' : 'No'}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      {isEditing ? (
                        <textarea
                          value={type.description}
                          onChange={(e) => handleMembershipTypeChange(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                        />
                      ) : (
                        <p className="text-gray-700 py-2">{type.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
