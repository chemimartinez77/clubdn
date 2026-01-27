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

  const handleAddMembershipType = () => {
    const newType: MembershipTypeConfig = {
      type: 'NUEVO' as any, // Temporal, el usuario deberá cambiarlo
      displayName: 'Nuevo Tipo',
      price: 0,
      hasKey: false,
      description: 'Descripción del nuevo tipo de membresía'
    };
    setMembershipTypes([...membershipTypes, newType]);
  };

  const handleRemoveMembershipType = (index: number) => {
    if (membershipTypes.length <= 1) {
      showError('Debe haber al menos un tipo de membresía');
      return;
    }
    const updated = membershipTypes.filter((_, i) => i !== index);
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
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Configuración del Club</h1>
            <p className="text-[var(--color-textSecondary)] mt-1">Gestiona los ajustes generales y tipos de membresía</p>
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
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Nombre del Club
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.clubName || ''}
                    onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                ) : (
                  <p className="text-[var(--color-text)] py-2">{config?.clubName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Email de Contacto
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.clubEmail || ''}
                    onChange={(e) => setFormData({ ...formData, clubEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    placeholder="email@clubdn.com"
                  />
                ) : (
                  <p className="text-[var(--color-text)] py-2">{config?.clubEmail || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Teléfono
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.clubPhone || ''}
                    onChange={(e) => setFormData({ ...formData, clubPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    placeholder="+34 XXX XXX XXX"
                  />
                ) : (
                  <p className="text-[var(--color-text)] py-2">{config?.clubPhone || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Moneda
                </label>
                {isEditing ? (
                  <select
                    value={formData.defaultCurrency || 'EUR'}
                    onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                ) : (
                  <p className="text-[var(--color-text)] py-2">{config?.defaultCurrency}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Dirección
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.clubAddress || ''}
                    onChange={(e) => setFormData({ ...formData, clubAddress: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                    placeholder="Dirección completa del club"
                  />
                ) : (
                  <p className="text-[var(--color-text)] py-2">{config?.clubAddress || '-'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tipos de Membresía */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tipos de Membresía</CardTitle>
              {isEditing && (
                <button
                  onClick={handleAddMembershipType}
                  className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Añadir Tipo
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {membershipTypes.map((type, index) => (
                <div key={index} className="border border-[var(--color-cardBorder)] rounded-lg p-4 relative">
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveMembershipType(index)}
                      className="absolute top-2 right-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar tipo de membresía"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                        Tipo
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={type.type}
                          onChange={(e) => handleMembershipTypeChange(index, 'type', e.target.value as any)}
                          className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                          placeholder="SOCIO, COLABORADOR, etc."
                        />
                      ) : (
                        <p className="text-[var(--color-text)] py-2 font-medium">{type.type}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                        Nombre a Mostrar
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={type.displayName}
                          onChange={(e) => handleMembershipTypeChange(index, 'displayName', e.target.value)}
                          className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        />
                      ) : (
                        <p className="text-[var(--color-text)] py-2">{type.displayName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                        Precio Mensual (€)
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={type.price}
                          onChange={(e) => handleMembershipTypeChange(index, 'price', parseFloat(e.target.value))}
                          className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        />
                      ) : (
                        <p className="text-[var(--color-text)] py-2">{type.price}€</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                        Tiene Llave
                      </label>
                      {isEditing ? (
                        <label className="flex items-center py-2">
                          <input
                            type="checkbox"
                            checked={type.hasKey}
                            onChange={(e) => handleMembershipTypeChange(index, 'hasKey', e.target.checked)}
                            className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-inputBorder)] rounded focus:ring-[var(--color-primary)]"
                          />
                          <span className="ml-2 text-[var(--color-text)]">Sí</span>
                        </label>
                      ) : (
                        <p className="text-[var(--color-text)] py-2">{type.hasKey ? 'Sí' : 'No'}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                        Descripción
                      </label>
                      {isEditing ? (
                        <textarea
                          value={type.description}
                          onChange={(e) => handleMembershipTypeChange(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                        />
                      ) : (
                        <p className="text-[var(--color-textSecondary)] py-2">{type.description}</p>
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

