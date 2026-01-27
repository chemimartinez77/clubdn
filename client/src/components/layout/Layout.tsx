// client/src/components/layout/Layout.tsx
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-tableRowHover)]">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-[var(--color-cardBackground)] border-t border-[var(--color-cardBorder)] py-6">
        <div className="container mx-auto px-4 text-center text-[var(--color-textSecondary)] text-sm">
          <p>© {new Date().getFullYear()} Club DN - Todos los derechos reservados</p>
        </div>
      </footer>
    </div>
  );
}

