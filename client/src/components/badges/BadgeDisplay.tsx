// client/src/components/badges/BadgeDisplay.tsx
import React from 'react';
import { BadgeDefinition, getCategoryIcon, getCategoryColor } from '../../types/badge';
import styled from '@emotion/styled';
import { useTheme } from '../../contexts/ThemeContext';

interface BadgeDisplayProps {
  badge: BadgeDefinition;
  isUnlocked: boolean;
  unlockedAt?: string;
  showProgress?: boolean;
  currentCount?: number;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badge,
  isUnlocked,
  unlockedAt,
  showProgress = false,
  currentCount = 0
}) => {
  const { theme } = useTheme();
  const categoryColor = getCategoryColor(badge.category);
  const categoryIcon = getCategoryIcon(badge.category);

  const progress = showProgress && !isUnlocked
    ? Math.min((currentCount / badge.requiredCount) * 100, 100)
    : 100;

  return (
    <BadgeCard
      theme={theme}
      isUnlocked={isUnlocked}
      categoryColor={categoryColor}
    >
      <BadgeIcon isUnlocked={isUnlocked}>
        {categoryIcon}
      </BadgeIcon>

      <BadgeInfo>
        <BadgeName isUnlocked={isUnlocked}>
          {badge.name}
        </BadgeName>

        <BadgeLevel theme={theme} categoryColor={categoryColor}>
          Nivel {badge.level}
        </BadgeLevel>

        <BadgeRequirement theme={theme}>
          {badge.requiredCount} juegos diferentes
        </BadgeRequirement>

        {showProgress && !isUnlocked && (
          <ProgressContainer theme={theme}>
            <ProgressBar>
              <ProgressFill
                progress={progress}
                categoryColor={categoryColor}
              />
            </ProgressBar>
            <ProgressText theme={theme}>
              {currentCount} / {badge.requiredCount}
            </ProgressText>
          </ProgressContainer>
        )}

        {isUnlocked && unlockedAt && (
          <UnlockedDate theme={theme}>
            Desbloqueado: {new Date(unlockedAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </UnlockedDate>
        )}
      </BadgeInfo>

      {isUnlocked && (
        <UnlockedBadge>✓</UnlockedBadge>
      )}
    </BadgeCard>
  );
};

// Styled Components
const BadgeCard = styled.div<{ theme: any; isUnlocked: boolean; categoryColor: string }>`
  position: relative;
  background: ${props => props.theme.colors.cardBackground};
  border: 2px solid ${props => props.isUnlocked ? props.categoryColor : props.theme.colors.cardBorder};
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  opacity: ${props => props.isUnlocked ? 1 : 0.6};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  ${props => !props.isUnlocked && `
    filter: grayscale(0.5);
  `}
`;

const BadgeIcon = styled.div<{ isUnlocked: boolean }>`
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${props => props.isUnlocked ? 'rgba(147, 51, 234, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  flex-shrink: 0;
`;

const BadgeInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const BadgeName = styled.h3<{ isUnlocked: boolean }>`
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: inherit;
`;

const BadgeLevel = styled.div<{ theme: any; categoryColor: string }>`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${props => props.categoryColor};
  margin-bottom: 0.25rem;
`;

const BadgeRequirement = styled.div<{ theme: any }>`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const ProgressContainer = styled.div<{ theme: any }>`
  margin-top: 0.5rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.25rem;
`;

const ProgressFill = styled.div<{ progress: number; categoryColor: string }>`
  height: 100%;
  width: ${props => props.progress}%;
  background: ${props => props.categoryColor};
  transition: width 0.3s ease;
`;

const ProgressText = styled.div<{ theme: any }>`
  font-size: 0.7rem;
  color: ${props => props.theme.colors.textSecondary};
  text-align: right;
`;

const UnlockedDate = styled.div<{ theme: any }>`
  font-size: 0.7rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 0.5rem;
  font-style: italic;
`;

const UnlockedBadge = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 24px;
  height: 24px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
`;

export default BadgeDisplay;
