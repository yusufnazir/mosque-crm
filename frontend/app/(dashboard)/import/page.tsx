'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Card from '@/components/Card';
import ToastNotification from '@/components/ToastNotification';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [notification, setNotification] = useState<{type: string, message: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          selectedFile.type === 'application/vnd.ms-excel' ||
          selectedFile.name.toLowerCase().endsWith('.xlsx') ||
          selectedFile.name.toLowerCase().endsWith('.xls')) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        setNotification({
          type: 'error',
          message: 'Please select a valid Excel file (.xlsx or .xls)'
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setNotification({
        type: 'error',
        message: 'Please select an Excel file to upload'
      });
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Using the backend API URL - assuming backend runs on port 8080
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/admin/import/excel`, {
        method: 'POST',
        body: formData,
        // Don't include Content-Type header when using FormData with file upload
        // The browser will set it automatically with the boundary
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult(result);
        setNotification({
          type: 'success',
          message: `Import completed: ${result.successfullyProcessed} records processed, ${result.skipped} skipped`
        });
      } else {
        const errorData = await response.json();
        setNotification({
          type: 'error',
          message: `Upload failed: ${errorData.message || 'Unknown error'}`
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setNotification({
        type: 'error',
        message: 'Upload failed: Network error or server unavailable'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-emerald-800">Import Members</h1>
        <p className="text-gray-600 mt-2">Upload an Excel file to import member data into the system</p>
      </div>
      
      {notification && (
        <div className="mb-6">
          <ToastNotification
            type={notification.type as 'success' | 'error' | 'info'}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        </div>
      )}

      <Card className="p-6">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload Excel File</h2>
          <p className="text-gray-600 text-sm mb-6">Select an Excel file containing member information to import</p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose Excel file</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="self-end">
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="whitespace-nowrap h-[42px]"
              >
                {isUploading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : 'Import Data'}
              </Button>
            </div>
          </div>
          
          {file && (
            <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-lg border border-emerald-100 mb-6">
              <div className="flex items-center">
                <div className="mr-3 p-2 bg-emerald-100 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <span className="font-medium text-gray-800">{file.name}</span>
                  <div className="text-sm text-gray-600">Size: {(file.size / 1024).toFixed(2)} KB</div>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={handleClear}
                size="sm"
              >
                Clear
              </Button>
            </div>
          )}
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="font-medium text-blue-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              File Requirements
            </h3>
            <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
              <li>Supported formats: .xlsx (Excel 2007+) and .xls (Excel 97-2003)</li>
              <li>Required columns: NAAM, VOORNAMEN, ADRES, EMAIL, Mobiel no, GESL, GEB.DAT., Gezinnen</li>
              <li>Gezinnen column is used to group family members together</li>
            </ul>
          </div>
        </div>

        {uploadResult && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Import Results
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-xl border border-emerald-200">
                <div className="text-emerald-800 font-bold text-2xl">{uploadResult.totalRecords}</div>
                <div className="text-emerald-700 text-sm font-medium">Total Records</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
                <div className="text-green-800 font-bold text-2xl">{uploadResult.successfullyProcessed}</div>
                <div className="text-green-700 text-sm font-medium">Successfully Processed</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl border border-yellow-200">
                <div className="text-yellow-800 font-bold text-2xl">{uploadResult.skipped}</div>
                <div className="text-yellow-700 text-sm font-medium">Skipped</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border border-red-200">
                <div className="text-red-800 font-bold text-2xl">{uploadResult.errors?.length || 0}</div>
                <div className="text-red-700 text-sm font-medium">Errors</div>
              </div>
            </div>

            <div className="space-y-6">
              {(uploadResult.errors && uploadResult.errors.length > 0) && (
                <div className="bg-red-50 p-5 rounded-xl border border-red-200">
                  <h4 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Errors Found
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-red-700 space-y-2 max-h-60 overflow-y-auto pr-2">
                    {uploadResult.errors.map((error: string, index: number) => (
                      <li key={index} className="p-2 bg-white rounded border border-red-100">{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(uploadResult.warnings && uploadResult.warnings.length > 0) && (
                <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                  <h4 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Warnings
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-2 max-h-60 overflow-y-auto pr-2">
                    {uploadResult.warnings.map((warning: string, index: number) => (
                      <li key={index} className="p-2 bg-white rounded border border-yellow-100">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}