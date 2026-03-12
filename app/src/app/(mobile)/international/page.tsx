import CountryList from '@/components/CountryList';

export default function InternationalPage() {
  return (
    <div>
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <h1 className="text-center py-3 font-bold text-lg">国际商标</h1>
      </header>
      <CountryList />
    </div>
  );
}
