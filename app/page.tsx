import Header from './components/Header';
import Footer from './components/Footer';
import HeroSection from './components/HeroSection';
import ToolSelection from './components/ToolSelection';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-secondary)] text-[var(--color-text-dark)]">
      <Header />
      <main className="flex-grow">
        <HeroSection />
        <ToolSelection />
      </main>
      <Footer />
    </div>
  );
}
