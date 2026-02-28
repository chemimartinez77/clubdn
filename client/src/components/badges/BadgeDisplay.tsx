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
    if (!isUnlocked) return;
    setPeeling(true);
    setTimeout(() => setRevealed(true), 650);
  };

  // La pegatina se muestra siempre hasta que el usuario la quite (solo posible si desbloqueado)
  const showSticker = !revealed;

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
          {badge.requiredCount} partidas jugadas
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

      {showSticker && (
        <Sticker peeling={peeling} isUnlocked={isUnlocked} onClick={handleReveal}>
          <StickerCorner />
          <StickerContent>
            <StickerIcon>🩹</StickerIcon>
            {/* Candado dentro de la pegatina */}
            <LockIcon isUnlocked={isUnlocked}>
              {isUnlocked ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.65 1.35-3 3-3s3 1.35 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
                </svg>
              )}
            </LockIcon>
            <StickerText>{isUnlocked ? 'Logro desbloqueado' : 'Logro oculto'}</StickerText>
            <StickerProgress>{currentCount} / {badge.requiredCount} partidas</StickerProgress>
          </StickerContent>
          {isUnlocked && (
            <StickerTapHint>
              <TapArrow>↗</TapArrow>
              <span>toca aquí</span>
            </StickerTapHint>
          )}
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

const tapPulse = keyframes`
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
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

const Sticker = styled.div<{ peeling: boolean; isUnlocked: boolean }>`
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
  cursor: ${props => props.isUnlocked ? 'pointer' : 'not-allowed'};
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

  ${props => props.isUnlocked && `
    &:hover {
      background: repeating-linear-gradient(
        -45deg,
        #c46010,
        #c46010 10px,
        #a34e0f 10px,
        #a34e0f 20px
      );
    }
  `}
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

const LockIcon = styled.div<{ isUnlocked: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.isUnlocked ? '#a7f3d0' : 'rgba(255,255,255,0.6)'};
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

const StickerTapHint = styled.div`
  position: absolute;
  bottom: 6px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.6rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.03em;
  animation: ${tapPulse} 1.8s ease-in-out infinite;
  pointer-events: none;
`;

const TapArrow = styled.span`
  font-size: 0.75rem;
  line-height: 1;
`;

export default BadgeDisplay;
