/**
 * Format logic for Guinea Franc (GNF/FGN)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('GNF', 'FGN');
};
