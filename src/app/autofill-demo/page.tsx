"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAutoFilledFormValues, ExamAssignment } from '@/services/exam-autofill';

export default function AutoFillDemo() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAutoFill = async (examId: string, subExamId?: string) => {
    setLoading(true);
    try {
      const assignment: ExamAssignment = {
        examId,
        subExamId,
        internIds: ['test@example.com'],
        dueDate: new Date(),
        assignedBy: 'admin'
      };

      console.log('Testing auto-fill with assignment:', assignment);
      const autoFillResult = await getAutoFilledFormValues(assignment);
      console.log('Auto-fill result:', autoFillResult);
      
      setResult(autoFillResult);
    } catch (error) {
      console.error('Auto-fill test failed:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Auto-Fill Demo</CardTitle>
          <CardDescription>
            Test the auto-fill functionality with different exam assignment types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Assignment Types:</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Main Exam Only</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Fills only main exam info, leaves sub-exams for manual selection
                </p>
                <Button 
                  onClick={() => testAutoFill('1')} 
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Test SSC (Main Only)
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Specific Sub-Exam</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Fills main exam + specific assigned sub-exam only
                </p>
                <Button 
                  onClick={() => testAutoFill('1', '1')} 
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Test SSC GD Constable
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Banking Category</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Test with Banking exams main category
                </p>
                <Button 
                  onClick={() => testAutoFill('2')} 
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Test Banking (Main Only)
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Railway Sub-Exam</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Test specific Railway sub-exam assignment
                </p>
                <Button 
                  onClick={() => testAutoFill('4', '1')} 
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Test Railway ALP
                </Button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2">URL Format Examples:</h4>
              <ul className="text-sm space-y-1">
                <li><code>/intern/1</code> - SSC main exam (no sub-exams auto-filled)</li>
                <li><code>/intern/1-1</code> - SSC GD Constable specifically assigned</li>
                <li><code>/intern/2-5</code> - Banking IBPS PO specifically assigned</li>
              </ul>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading auto-fill data...</span>
              </div>
            )}

            {result && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Auto-Fill Result:</h3>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
