import React, { useState, useEffect } from 'react';
import './EditableBio.css';

const EditableBio = ({ 
  bio = '', 
  isOwnProfile = false, 
  onSave, 
  placeholder = "Add a description about yourself..." 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [bioText, setBioText] = useState(bio);
  const [tempBio, setTempBio] = useState(bio);
  const maxLength = 75;

  useEffect(() => {
    setBioText(bio);
    setTempBio(bio);
  }, [bio]);

  const handleEdit = () => {
    setIsEditing(true);
    setTempBio(bioText);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempBio(bioText);
  };

  const handleSave = async () => {
    if (tempBio.trim() !== bioText) {
      try {
        await onSave(tempBio.trim());
        setBioText(tempBio.trim());
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to save bio:', error);
        // Revert on error
        setTempBio(bioText);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div className="bio-container">
        <div className="bio-content">
          {bioText ? (
            <p className="bio-text">{bioText}</p>
          ) : isOwnProfile ? (
            <p className="bio-placeholder">{placeholder}</p>
          ) : null}
        </div>
        {isOwnProfile && (
          <button 
            className="bio-edit-btn" 
            onClick={handleEdit}
            aria-label="Edit bio"
          >
            Edit
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bio-container editing">
      <div className="bio-edit-content">
        <textarea
          value={tempBio}
          onChange={(e) => setTempBio(e.target.value)}
          onKeyDown={handleKeyPress}
          maxLength={maxLength}
          placeholder={isOwnProfile ? placeholder : ''}
          className="bio-textarea"
          autoFocus
        />
        <div className="bio-char-count">
          {tempBio.length}/{maxLength}
        </div>
      </div>
      <div className="bio-edit-actions">
        <button 
          className="bio-save-btn" 
          onClick={handleSave}
          disabled={tempBio.trim() === bioText}
        >
          Save
        </button>
        <button 
          className="bio-cancel-btn" 
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default EditableBio; 