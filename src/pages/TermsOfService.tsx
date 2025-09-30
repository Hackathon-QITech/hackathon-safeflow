import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertTriangle, Scale, Copyright, ArrowLeft } from 'lucide-react';

const TermsOfService = () => {
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
            <CardTitle className="text-3xl text-secondary">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-secondary text-secondary-foreground p-3 rounded-full">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Usage Terms</h3>
                <p className="text-muted-foreground">
                  SafeFlow is a peer-to-peer financial simulation platform created for 
                  educational and demonstration purposes. This is not a real financial 
                  service. No actual money is transferred, and all transactions are simulated 
                  using demo data. By using SafeFlow, you acknowledge that this is a prototype 
                  application for hackathon evaluation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-secondary text-secondary-foreground p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">User Responsibilities</h3>
                <p className="text-muted-foreground mb-3">
                  As a user of SafeFlow, you agree to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Provide accurate information during registration</li>
                  <li>Maintain the confidentiality of your account credentials</li>
                  <li>Use the platform only for its intended demonstration purposes</li>
                  <li>Not attempt to exploit, hack, or misuse the system</li>
                  <li>Understand that all data is simulated and for testing only</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-secondary text-secondary-foreground p-3 rounded-full">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Limitations</h3>
                <p className="text-muted-foreground">
                  SafeFlow is provided "as is" without warranties of any kind. We do not 
                  guarantee continuous availability, accuracy, or security of the platform. 
                  The anti-fraud system, credit scoring, and two-factor authentication are 
                  demonstration features and should not be relied upon for actual financial 
                  security. This application is not regulated by any financial authority.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-secondary text-secondary-foreground p-3 rounded-full">
                <Copyright className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Intellectual Property</h3>
                <p className="text-muted-foreground">
                  SafeFlow is released under the MIT License. The source code, design, and 
                  concept are available for educational use and modification. You are free 
                  to study, modify, and distribute this application in accordance with the 
                  MIT License terms. All third-party libraries and assets used in this 
                  project remain under their respective licenses.
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-2">Liability Disclaimer</h3>
              <p className="text-muted-foreground mb-4">
                The creators of SafeFlow are not liable for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Any data loss or system failures</li>
                <li>Misunderstandings about the simulated nature of transactions</li>
                <li>Any decisions made based on demo credit scores or fraud alerts</li>
                <li>Unauthorized access to accounts due to weak passwords</li>
                <li>Any damages arising from the use or inability to use the platform</li>
              </ul>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Important:</strong> By registering and using SafeFlow, you confirm 
                that you understand this is a demonstration application only. No real money 
                is involved, and no actual financial services are provided. All features are 
                for educational and evaluation purposes in a hackathon context.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
