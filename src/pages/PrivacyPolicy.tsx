import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Database, Lock, Users, ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <Button variant="outline" onClick={() => navigate('/auth')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-secondary">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground p-3 rounded-full">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Data Collection</h3>
                <p className="text-muted-foreground">
                  We collect your email address, name, CPF, birth date, transaction history, 
                  and wallet balance to provide our peer-to-peer payment services. This data 
                  is essential for account creation, authentication, and transaction processing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground p-3 rounded-full">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Data Usage</h3>
                <p className="text-muted-foreground">
                  Your information is used exclusively for providing SafeFlow services, 
                  including identity verification, fraud prevention, credit score calculation, 
                  and facilitating secure peer-to-peer transfers. We never sell your data to 
                  third parties.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground p-3 rounded-full">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Data Protection</h3>
                <p className="text-muted-foreground">
                  All data is stored securely using industry-standard encryption. Passwords 
                  are hashed, and sensitive information is protected with multiple layers of 
                  security. We implement anti-fraud monitoring and two-factor authentication 
                  to safeguard your account.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground p-3 rounded-full">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Data Sharing</h3>
                <p className="text-muted-foreground">
                  When you use Google OAuth for authentication, we share minimal necessary 
                  information with Google for identity verification. Transaction data is 
                  shared only between parties involved in a transfer. We do not share your 
                  personal information with any other third parties without your consent.
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-2">Your Rights</h3>
              <p className="text-muted-foreground mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Access your personal data</li>
                <li>Request data correction or deletion</li>
                <li>Withdraw consent for data processing</li>
                <li>Export your data in a portable format</li>
                <li>Opt-out of non-essential data collection</li>
              </ul>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> SafeFlow is a simulation for demonstration purposes. 
                No real financial transactions occur. All data is stored locally and used 
                only for hackathon evaluation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
