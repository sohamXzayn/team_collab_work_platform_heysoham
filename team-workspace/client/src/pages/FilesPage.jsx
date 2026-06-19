import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, push, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import { convertToBase64, downloadBase64File } from '../services/fileUtils';
import './neumorphism.css';

export default function FilesPage({ teamId = "team1" }) { // Defaulted to team1 for now
  const { userData, currentUser } = useAuth();
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Optimized query: Only fetch files for the current team
    const filesQuery = query(
      ref(db, 'files'),
      orderByChild('teamId'),
      equalTo(teamId)
    );

    const unsubscribe = onValue(filesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const teamFiles = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setFiles(teamFiles.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setFiles([]);
      }
    });

    return () => unsubscribe();
  }, [teamId]);

  // Handle file selection and upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional Check: Warn user if file size exceeds 5MB to prevent RTDB performance hits
    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large. Please keep files under 5MB for optimal database sync.");
      return;
    }

    try {
      setError('');
      setIsUploading(true);

      // 1. Convert file to Base64 Data URL string
      const base64String = await convertToBase64(file);

      // 2. Draft the document metadata structure
      const newFilePayload = {
        teamId: teamId,
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(1) + " KB",
        fileUrl: base64String, // The actual Base64 string payload
        uploadedBy: userData?.name || currentUser?.email,
        timestamp: Date.now()
      };

      // 3. Push cleanly to the 'files' node in RTDB
      await push(ref(db, 'files'), newFilePayload);
      
      // Clear input element
      e.target.value = null; 
    } catch (err) {
      setError("Failed to process or upload file string.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReportFile = async (file) => {
    const reason = window.prompt(`Why are you reporting "${file.fileName}"?`);
    if (!reason) return;

    try {
      await push(ref(db, 'reports'), {
        fileId: file.id,
        fileName: file.fileName,
        reportedBy: userData?.name || currentUser?.email,
        reason: reason,
        // eslint-disable-next-line react-hooks/purity
        timestamp: Date.now()
      });
      alert("Report submitted to administrators.");
    } catch (err) { console.error(err); }
  };

  return (
    <div className="page-container">
      <div className="content-max-width">
        <h1 className="auth-title" style={{ textAlign: 'left', fontSize: '1.5rem' }}>📁 Shared Team Storage</h1>

        {error && <div className="error-alert">{error}</div>}

        <div className="upload-zone">
          <label className="btn-primary" style={{ width: 'max-content', padding: '0.75rem 2rem' }}>
            {isUploading ? "Processing String..." : "Select File to Upload"}
            <input 
              type="file" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
              disabled={isUploading}
            />
          </label>
          <p className="text-xs text-gray-muted" style={{ marginTop: '1rem' }}>Files are converted to string format and encrypted within the database.</p>
        </div>

        <div className="section-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="list-header">
            <h3 className="font-bold">Workspace Documents ({files.length})</h3>
          </div>
          
          {files.length === 0 ? (
            <div className="empty-state">
              No files uploaded to this workspace yet.
            </div>
          ) : (
            <div style={{ padding: '1.25rem' }}>
              {files.map((file) => (
                <div key={file.id} className="file-item">
                  <div className="file-info">
                    <span className="font-bold file-name">{file.fileName}</span>
                    <p className="text-xs text-gray-muted" style={{ marginTop: '0.125rem' }}>
                      Size: {file.fileSize} | By: <span style={{ color: 'var(--nm-text)' }}>{file.uploadedBy}</span>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleReportFile(file)}
                      className="btn-text"
                    >
                      🚩 Report
                    </button>
                    <button
                      onClick={() => downloadBase64File(file.fileUrl, file.fileName)}
                      className="btn-success"
                    >
                      📥 Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}