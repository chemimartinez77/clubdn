export function getPublicMembershipLabel(membershipType?: string | null): string {
  switch (membershipType) {
    case 'SOCIO':
      return 'Socio';
    case 'COLABORADOR':
    case 'FAMILIAR':
      return 'Colaborador';
    case 'EN_PRUEBAS':
      return 'Colaborador en pruebas';
    case 'BAJA':
      return 'Baja';
    default:
      return 'Miembro';
  }
}

export function getAdminMembershipLabel(membershipType?: string | null): string {
  switch (membershipType) {
    case 'SOCIO':
      return 'Socio';
    case 'COLABORADOR':
      return 'Colaborador';
    case 'FAMILIAR':
      return 'Familiar';
    case 'EN_PRUEBAS':
      return 'En pruebas';
    case 'BAJA':
      return 'Baja';
    default:
      return 'Miembro';
  }
}
