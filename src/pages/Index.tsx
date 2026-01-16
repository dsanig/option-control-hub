import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { OptionsTab } from '@/components/options/OptionsTab';
import { StocksTab } from '@/components/stocks/StocksTab';
import { RiskTab } from '@/components/risk/RiskTab';
import { SettingsTab } from '@/components/settings/SettingsTab';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const handleRefresh = () => {
    setLastRefresh(new Date());
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'options':
        return <OptionsTab />;
      case 'stocks':
        return <StocksTab />;
      case 'risk':
        return <RiskTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      connectionStatus="ok"
      lastRefresh={lastRefresh}
      onRefresh={handleRefresh}
    >
      <div className="h-[calc(100vh-57px)] overflow-auto">
        {renderContent()}
      </div>
    </AppLayout>
  );
};

export default Index;
