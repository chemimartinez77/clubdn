// client/src/components/badges/BadgeGrid.tsx
import React, { useState, useCallback } from 'react';
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
  getCategoryColor,
  getCategoryDescription
} from '../../types/badge';
import BadgeDisplay from './BadgeDisplay';

interface BadgeGridProps {
  allBadges: BadgeDefinition[];
  unlockedBadges: UserBadge[];
  progress: Record<BadgeCategory, BadgeProgress>;
  userId?: string;
}

const BadgeGrid: React.FC<BadgeGridProps> = ({
  allBadges,
  unlockedBadges,
  progress,
  userId
}) => {
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'ALL'>('ALL');
  const [expandedCategories, setExpandedCategories] = useState<Set<BadgeCategory>>(new Set());

  // Clave única en localStorage por usuario
  const storageKey = userId ? `badges_revealed_${userId}` : 'badges_revealed_guest';

  // Cargar IDs revelados desde localStorage
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const handleReveal = useCallback((badgeId: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      next.add(badgeId);
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch { /* noop */ }
      return next;
    });
  }, [storageKey]);

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
  const discoveredCount = unlockedBadges.filter(ub => revealedIds.has(ub.badgeDefinitionId)).length;
  const pendingDiscovery = unlockedCount - discoveredCount;

  return (
    <Container theme={theme}>
      <Header theme={theme}>
        <HeaderTop>
          <Title theme={theme}>Logros y Badges</Title>
          <Stats theme={theme}>
            <StatItem>
              <StatValue>{discoveredCount} / {totalBadges}</StatValue>
              <StatLabel>desbloqueados</StatLabel>
            </StatItem>
            {pendingDiscovery > 0 && (
              <StatItem>
                <StatValue pending>{pendingDiscovery}</StatValue>
                <StatLabel>por descubrir</StatLabel>
              </StatItem>
            )}
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
                        <> • {categoryProgress.count} partidas jugadas</>
                      )}
                    </CategoryStats>
                  </div>
                </CategoryTitle>
                <ExpandIcon isExpanded={isExpanded}>▾</ExpandIcon>
              </CategoryHeader>

              {isExpanded && getCategoryDescription(category) && (
                <CategoryDescription>{getCategoryDescription(category)}</CategoryDescription>
              )}

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
                        currentCount={categoryProgress?.count || 0}
                        isRevealed={revealedIds.has(badge.id)}
                        onReveal={handleReveal}
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

const StatValue = styled.div<{ pending?: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.pending ? '#f59e0b' : 'var(--color-primary)'};
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

const CategoryDescription = styled.p`
  font-size: 0.8rem;
  color: var(--color-textSecondary);
  font-style: italic;
  margin: -0.5rem 0 0.75rem 0;
  padding: 0.6rem 1rem;
  border-left: 3px solid #06b6d4;
  background: rgba(6, 182, 212, 0.06);
  border-radius: 0 6px 6px 0;
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
