// src/App.tsx
import { useState } from 'react';
import {
  Header,
  EmailList,
  ComposeForm,
  ConnectModal,
  EmailDetailModal,
  WelcomeScreen,
  Toast
} from './components';
import { useToast } from './hooks/useToast';
import { useWallet } from './hooks/useWallet';
import { Email } from './types';

function App() {
  const { toast, showToast } = useToast();
  const {
    isConnected,
    contract,
    userAddress,
    networkName,
    emails,
    isLoadingMessages,
    connectHardhat,
    connectMetaMask,
    disconnect,
    addEmail,
    markAsRead,
  } = useWallet(showToast);

  // UI state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [replyTo, setReplyTo] = useState('');

  // Handle email click
  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    markAsRead(email.id);
  };

  // Handle reply
  const handleReply = (address: string) => {
    setReplyTo(address);
    setSelectedEmail(null);
  };

  // Handle connect
  const handleConnectHardhat = async (index: number) => {
    await connectHardhat(index);
    setShowConnectModal(false);
  };

  const handleConnectMetaMask = async () => {
    await connectMetaMask();
    setShowConnectModal(false);
  };

  return (
    <div className="min-h-screen bg-dark-primary bg-pattern">
      <Header
        isConnected={isConnected}
        userAddress={userAddress}
        networkName={networkName}
        onConnect={() => setShowConnectModal(true)}
        onDisconnect={disconnect}
      />

      <main className="max-w-7xl mx-auto p-6 flex gap-6">
        {!isConnected ? (
          <WelcomeScreen onConnect={() => setShowConnectModal(true)} />
        ) : (
          <>
            <EmailList
              emails={emails}
              isLoading={isLoadingMessages}
              onEmailClick={handleEmailClick}
            />
            <ComposeForm
              isConnected={isConnected}
              userAddress={userAddress}
              contract={contract}
              onMessageSent={addEmail}
              onError={(msg) => showToast(msg, 'error')}
              onSuccess={(msg) => showToast(msg, 'success')}
              initialRecipient={replyTo}
            />
          </>
        )}
      </main>

      <ConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnectHardhat={handleConnectHardhat}
        onConnectMetaMask={handleConnectMetaMask}
      />

      <EmailDetailModal
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
        onReply={handleReply}
      />

      {toast && <Toast toast={toast} />}
    </div>
  );
}

export default App;
