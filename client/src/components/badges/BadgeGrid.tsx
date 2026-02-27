// client/src/components/badges/BadgeGrid.tsx
import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useTheme } from '../../hooks/useTheme';
import type {
  BadgeDefinition,
  UserBadge,
  BadgeProgress,
  BadgeCategory
} from '../../types/badge';
import {
  getCategoryDisplayName,
  getCategoryIcon,
  getCategoryColor
} from '../../types/badge';
import BadgeDisplay from './BadgeDisplay';

interface BadgeGridProps {
  allBadges: BadgeDefinition[];
  unlockedBadges: UserBadge[];
  progress: Record<BadgeCategory, BadgeProgress>;
}

const BadgeGrid: React.FC<BadgeGridProps> = ({
  allBadges,
  unlockedBadges,
  progress
}) => {
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'ALL'>('ALL');
  const [expandedCategories, setExpandedCategories] = useState<Set<BadgeCategory>>(new Set());

  const toggleCategory = (category: BadgeCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Agrupar badges por categoría
  const badgesByCategory = allBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<BadgeCategory, BadgeDefinition[]>);

  // Ordenar badges por nivel dentro de cada categoría
  Object.keys(badgesByCategory).forEach(category => {
    badgesByCategory[category as BadgeCategory].sort((a, b) => a.level - b.level);
  });

  // Crear un Set de IDs de badges desbloqueados para búsqueda rápida
  const unlockedBadgeIds = new Set(
    unlockedBadges.map(ub => ub.badgeDefinitionId)
  );

  // Encontrar fecha de desbloqueo para un badge
  const getUnlockedDate = (badgeId: string): string | undefined => {
    const userBadge = unlockedBadges.find(ub => ub.badgeDefinitionId === badgeId);
    return userBadge?.unlockedAt;
  };

  // Filtrar categorías
  const categories = Object.keys(badgesByCategory) as BadgeCategory[];
  const displayedCategories = selectedCategory === 'ALL'
    ? categories
    : [selectedCategory];

  // Calcular estadísticas
  const totalBadges = allBadges.length;
  const unlockedCount = unlockedBadges.length;
  const completionPercentage = totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0;

  return (
    <Container theme={theme}>
      <Header theme={theme}>
        <HeaderTop>
          <Title theme={theme}>Logros y Badges</Title>
          <Stats theme={theme}>
            <StatItem>
              <StatValue>{unlockedCount}</StatValue>
              <StatLabel>/ {totalBadges} desbloqueados</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{completionPercentage}%</StatValue>
              <StatLabel>completado</StatLabel>
            </StatItem>
          </Stats>
        </HeaderTop>

        <CategoryFilters>
          <FilterButton
            theme={theme}
            active={selectedCategory === 'ALL'}
            onClick={() => setSelectedCategory('ALL')}
          >
            Todas
          </FilterButton>
          {categories.map(category => (
            <FilterButton
              key={category}
              theme={theme}
              active={selectedCategory === category}
              categoryColor={getCategoryColor(category)}
              onClick={() => setSelectedCategory(category)}
            >
              {getCategoryIcon(category)} {getCategoryDisplayName(category)}
            </FilterButton>
          ))}
        </CategoryFilters>
      </Header>

      <BadgesContainer>
        {displayedCategories.map(category => {
          const categoryBadges = badgesByCategory[category] || [];
          const categoryProgress = progress[category];
          const unlockedInCategory = categoryBadges.filter(badge =>
            unlockedBadgeIds.has(badge.id)
          ).length;

          const isExpanded = expandedCategories.has(category);

          return (
            <CategorySection key={category}>
              <CategoryHeader
                theme={theme}
                categoryColor={getCategoryColor(category)}
                onClick={() => toggleCategory(category)}
              >
                <CategoryTitle>
                  <CategoryIconLarge>{getCategoryIcon(category)}</CategoryIconLarge>
                  <div>
                    <CategoryName>{getCategoryDisplayName(category)}</CategoryName>
                    <CategoryStats theme={theme}>
                      {unlockedInCategory} / {categoryBadges.length} desbloqueados
                      {categoryProgress && (
                        <> • {categoryProgress.count} juegos jugados</>
                      )}
                    </CategoryStats>
                  </div>
                </CategoryTitle>
                <ExpandIcon isExpanded={isExpanded}>▾</ExpandIcon>
              </CategoryHeader>

              {isExpanded && (
                <BadgeList>
                  {categoryBadges.map(badge => {
                    const isUnlocked = unlockedBadgeIds.has(badge.id);
                    const unlockedAt = getUnlockedDate(badge.id);

                    return (
                      <BadgeDisplay
                        key={badge.id}
                        badge={badge}
                        isUnlocked={isUnlocked}
                        unlockedAt={unlockedAt}
                        showProgress={!isUnlocked}
                        currentCount={categoryProgress?.count || 0}
                      />
                    );
                  })}
                </BadgeList>
              )}
            </CategorySection>
          );
        })}
      </BadgesContainer>
    </Container>
  );
};

// Styled Components
const Container = styled.div<{ theme: any }>`
  width: 100%;
`;

const Header = styled.div<{ theme: any }>`
  margin-bottom: 2rem;
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-text);
`;

const Stats = styled.div`
  display: flex;
  gap: 2rem;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: var(--color-textSecondary);
  margin-top: 0.25rem;
`;

const CategoryFilters = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{
  active: boolean;
  categoryColor?: string;
}>`
  padding: 0.5rem 1rem;
  border: 2px solid ${props =>
    props.active
      ? props.categoryColor || 'var(--color-primary)'
      : 'var(--color-cardBorder)'};
  background: ${props =>
    props.active
      ? props.categoryColor || 'var(--color-primary)'
      : 'var(--color-cardBackground)'};
  color: ${props =>
    props.active ? '#ffffff' : 'var(--color-text)'};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const BadgesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const CategorySection = styled.div``;

const CategoryHeader = styled.div<{ categoryColor: string }>`
  background: var(--color-cardBackground);
  border-left: 4px solid ${props => props.categoryColor};
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;

  &:hover {
    background: var(--color-tableRowHover);
  }
`;

const ExpandIcon = styled.span<{ isExpanded: boolean }>`
  font-size: 1.25rem;
  color: var(--color-textSecondary);
  transition: transform 0.2s ease;
  transform: ${props => props.isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'};
`;

const CategoryTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
`;

const CategoryIconLarge = styled.div`
  font-size: 2rem;
`;

const CategoryName = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
`;

const CategoryStats = styled.div`
  font-size: 0.875rem;
  color: var(--color-textSecondary);
  margin-top: 0.25rem;
`;

const BadgeList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export default BadgeGrid;
