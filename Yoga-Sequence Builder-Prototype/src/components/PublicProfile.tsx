import React from 'react';
import { Profile } from './Profile';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';

interface PublicProfileProps {
  onBack: () => void;
}

export function PublicProfile({ onBack }: PublicProfileProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto">
        <div className="py-6">
          <div className="mb-6">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>
          
          <div className="mb-6">
            <h1 className="text-center">Sculpt Sequence Builder</h1>
          </div>

          <Profile 
            userEmail="instructor@example.com" 
            isViewerMode={true} 
          />
        </div>
      </div>
    </div>
  );
}
