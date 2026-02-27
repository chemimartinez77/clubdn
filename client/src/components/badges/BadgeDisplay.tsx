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
  currentCount?: number;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badge,
  isUnlocked,
  unlockedAt,
  currentCount = 0
}) => {
  const categoryColor = getCategoryColor(badge.category);
  const categoryIcon = getCategoryIcon(badge.category);
  const [revealed, setRevealed] = useState(false);
  const [peeling, setPeeling] = useState(false);

  const progress = !isUnlocked
    ? Math.min((currentCount / badge.requiredCount) * 100, 100)
    : 100;

  const handleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPeeling(true);
    setTimeout(() => setRevealed(true), 650);
  };

  const showSticker = !isUnlocked && !revealed;

  return (
    <BadgeCard isUnlocked={isUnlocked} categoryColor={categoryColor} showSticker={showSticker}>
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

        {!isUnlocked && (
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
          <StickerCorner />
          <StickerContent>
            <StickerIcon>🩹</StickerIcon>
            <StickerText>Logro oculto</StickerText>
            <StickerProgress>{currentCount} / {badge.requiredCount} partidas</StickerProgress>
            <StickerButton>Quitar tirita</StickerButton>
          </StickerContent>
        </Sticker>
      )}
    </BadgeCard>
  );
};

// Animación de tirita que se despega desde la esquina inferior derecha y sale volando
const peelAnimation = keyframes`
  0% {
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
    transform: rotate(0deg) translate(0, 0);
    opacity: 1;
  }
  30% {
    clip-path: polygon(0% 0%, 100% 0%, 100% 60%, 60% 100%, 0% 100%);
    transform: rotate(0deg) translate(0, 0);
    opacity: 1;
  }
  60% {
    clip-path: polygon(0% 0%, 100% 0%, 100% 0%, 100% 100%, 0% 100%);
    transform: rotate(-6deg) translate(-5px, -10px);
    opacity: 1;
  }
  100% {
    clip-path: polygon(0% 0%, 100% 0%, 100% 0%, 100% 100%, 0% 100%);
    transform: rotate(-20deg) translate(-80px, -120px) scale(0.6);
    opacity: 0;
  }
`;

const cornerPeel = keyframes`
  0%   { width: 0; height: 0; }
  30%  { width: 28px; height: 28px; }
  100% { width: 28px; height: 28px; }
`;

// Styled Components
const BadgeCard = styled.div<{ isUnlocked: boolean; categoryColor: string; showSticker: boolean }>`
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
  overflow: ${props => props.showSticker ? 'visible' : 'hidden'};

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
  inset: -2px;
  background: repeating-linear-gradient(
    -45deg,
    #b45309,
    #b45309 10px,
    #92400e 10px,
    #92400e 20px
  );
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  animation: ${props => props.peeling ? peelAnimation : 'none'} 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 10px;
    border: 2px dashed rgba(255, 255, 255, 0.25);
    pointer-events: none;
  }

  &:hover {
    background: repeating-linear-gradient(
      -45deg,
      #c46010,
      #c46010 10px,
      #a34e0f 10px,
      #a34e0f 20px
    );
  }
`;

// Triángulo en la esquina inferior derecha simulando el inicio del despegue
const StickerCorner = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 22px 22px;
  border-color: transparent transparent rgba(0,0,0,0.35) transparent;
  border-bottom-right-radius: 10px;
  animation: ${cornerPeel} 0.65s ease forwards;
  pointer-events: none;
`;

const StickerContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
`;

const StickerIcon = styled.div`
  font-size: 1.75rem;
`;

const StickerText = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StickerProgress = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.65);
`;

const StickerButton = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  color: #fef3c7;
  border: 1px solid rgba(254, 243, 199, 0.6);
  border-radius: 4px;
  padding: 0.2rem 0.6rem;
  margin-top: 0.2rem;
  letter-spacing: 0.03em;
`;

export default BadgeDisplay;
