// client/src/components/badges/BadgeDisplay.tsx
import React, { useState } from 'react';
import type { BadgeDefinition } from '../../types/badge';
import { getCategoryIcon, getCategoryColor } from '../../types/badge';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

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
  const categoryColor = getCategoryColor(badge.category);
  const categoryIcon = getCategoryIcon(badge.category);
  const [revealed, setRevealed] = useState(false);
  const [peeling, setPeeling] = useState(false);

  const progress = showProgress && !isUnlocked
    ? Math.min((currentCount / badge.requiredCount) * 100, 100)
    : 100;

  const handleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPeeling(true);
    setTimeout(() => setRevealed(true), 500);
  };

  const showSticker = !isUnlocked && !revealed;

  return (
    <BadgeCard isUnlocked={isUnlocked} categoryColor={categoryColor}>
      <BadgeIcon isUnlocked={isUnlocked}>
        {categoryIcon}
      </BadgeIcon>

      <BadgeInfo>
        <BadgeName isUnlocked={isUnlocked}>
          {badge.name}
        </BadgeName>

        <BadgeLevel categoryColor={categoryColor}>
          Nivel {badge.level}
        </BadgeLevel>

        <BadgeRequirement>
          {badge.requiredCount} juegos diferentes
        </BadgeRequirement>

        {showProgress && !isUnlocked && (
          <ProgressContainer>
            <ProgressBar>
              <ProgressFill progress={progress} categoryColor={categoryColor} />
            </ProgressBar>
            <ProgressText>
              {currentCount} / {badge.requiredCount}
            </ProgressText>
          </ProgressContainer>
        )}

        {isUnlocked && unlockedAt && (
          <UnlockedDate>
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

      {showSticker && (
        <Sticker peeling={peeling} onClick={handleReveal}>
          <StickerIcon>🔒</StickerIcon>
          <StickerText>Logro oculto</StickerText>
          <StickerButton>Revelar</StickerButton>
        </Sticker>
      )}
    </BadgeCard>
  );
};

// Animaciones
const peelOff = keyframes`
  0%   { transform: rotate(0deg) scale(1);   opacity: 1; transform-origin: top left; }
  40%  { transform: rotate(-8deg) scale(1.05) translateY(-4px); opacity: 1; transform-origin: top left; }
  100% { transform: rotate(-15deg) scale(0.7) translate(-60px, -40px); opacity: 0; transform-origin: top left; }
`;

// Styled Components
const BadgeCard = styled.div<{ isUnlocked: boolean; categoryColor: string }>`
  position: relative;
  background: var(--color-cardBackground);
  border: 2px solid ${props => props.isUnlocked ? props.categoryColor : 'var(--color-cardBorder)'};
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  opacity: ${props => props.isUnlocked ? 1 : 0.6};
  overflow: hidden;

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

const BadgeLevel = styled.div<{ categoryColor: string }>`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${props => props.categoryColor};
  margin-bottom: 0.25rem;
`;

const BadgeRequirement = styled.div`
  font-size: 0.75rem;
  color: var(--color-textSecondary);
`;

const ProgressContainer = styled.div`
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

const ProgressText = styled.div`
  font-size: 0.7rem;
  color: var(--color-textSecondary);
  text-align: right;
`;

const UnlockedDate = styled.div`
  font-size: 0.7rem;
  color: var(--color-textSecondary);
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

const Sticker = styled.div<{ peeling: boolean }>`
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    -45deg,
    #1e293b,
    #1e293b 10px,
    #0f172a 10px,
    #0f172a 20px
  );
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  animation: ${props => props.peeling ? peelOff : 'none'} 0.5s ease-in forwards;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 10px;
    border: 2px dashed rgba(255,255,255,0.15);
    pointer-events: none;
  }

  &:hover {
    background: repeating-linear-gradient(
      -45deg,
      #263548,
      #263548 10px,
      #1a2535 10px,
      #1a2535 20px
    );
  }
`;

const StickerIcon = styled.div`
  font-size: 1.75rem;
`;

const StickerText = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StickerButton = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  color: #60a5fa;
  border: 1px solid #60a5fa;
  border-radius: 4px;
  padding: 0.2rem 0.6rem;
  margin-top: 0.2rem;
  letter-spacing: 0.03em;
`;

export default BadgeDisplay;
