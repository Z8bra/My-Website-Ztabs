document.addEventListener('DOMContentLoaded', () => {
  // Initialize storage if not exists
  if (!localStorage.getItem('pendingSubmissions')) {
    localStorage.setItem('pendingSubmissions', JSON.stringify([]));
  }
  if (!localStorage.getItem('approvedTabs')) {
    localStorage.setItem('approvedTabs', JSON.stringify([]));
  }
  if (!localStorage.getItem('approvedCourses')) {
    localStorage.setItem('approvedCourses', JSON.stringify([]));
  }

  // Handle tab form submission
  const tabForm = document.getElementById('tabForm');
  const courseForm = document.getElementById('courseForm');
  
  const successModal = document.getElementById('successModal');
  const modalCloseBtns = document.querySelectorAll('.close-modal, .modal-close-btn');
  
  // Helper function to show success message
  function showSuccess(message) {
    alert(message);
  }
  
  // Helper function to store submission
  function storeSubmission(formData, type) {
    try {
      const submissions = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
      const id = 'pending_' + Date.now();
      const submission = {
        id: id,
        type: type,
        data: formData,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      
      submissions.unshift(submission);
      localStorage.setItem('pendingSubmissions', JSON.stringify(submissions));
      
      // Redirect to view the new submission
      setTimeout(() => {
        window.location.href = `tab-details.html?id=${id}`;
      }, 500);
      
      return { success: true, id: id };
    } catch (error) {
      console.error('Error storing submission:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Handle tab form submission
  if (tabForm) {
    const submitBtn = tabForm.querySelector('.submit-btn');
    const btnText = tabForm.querySelector('.btn-text');
    const spinner = tabForm.querySelector('.spinner');
    
    tabForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Show loading state
      submitBtn.disabled = true;
      btnText.textContent = 'Submitting...';
      spinner.classList.remove('hidden');
      
      try {
        const title = tabForm.querySelector('#title').value.trim();
        const artist = tabForm.querySelector('#artist').value.trim();
        const content = tabForm.querySelector('#content').value.trim();
        const chords = tabForm.querySelector('#chords').value.trim();
        const capo = tabForm.querySelector('#capo').value.trim() || '0';
        
        if (!title || !artist || !content) {
          throw new Error('Please fill in all required fields');
        }
        
        const formData = {
          id: 'tab-' + Date.now(),
          type: 'tab',
          status: 'pending',
          submittedAt: new Date().toISOString(),
          title: title,
          artist: artist,
          content: content,
          chords: chords,
          capo: capo,
          // Remove email requirement
          timestamp: new Date().toISOString(),
          views: 0,
          likes: 0
        };
        
        console.log('Submitting tab:', formData);
        
        // Store the tab submission
        const stored = storeSubmission(formData);
        
        if (stored) {
          // Show success message
          alert('Your tab has been submitted for review! It will appear after approval.');
          tabForm.reset();
          
          // Update the admin panel if it's open
          if (window.updateAdminPanel) {
            window.updateAdminPanel();
          }
          
          // Refresh the tabs list if on the tabs page
          if (window.loadTabs) {
            window.loadTabs();
          }
          
          // Hide the form after successful submission
          const creatorInline = document.getElementById('creatorInline');
          if (creatorInline) creatorInline.classList.add('hidden');
          
        } else {
          throw new Error('Failed to store submission');
        }
        
      } catch (error) {
        console.error('Error submitting tab:', error);
        alert(error.message || 'There was an error submitting your tab. Please try again.');
      } finally {
        submitBtn.disabled = false;
        btnText.textContent = 'Submit for Review';
        spinner.classList.add('hidden');
      }
    });
  }
  
  // Handle course form submission
  if (courseForm) {
    const submitBtn = courseForm.querySelector('.submit-btn');
    const btnText = courseForm.querySelector('.btn-text');
    const spinner = courseForm.querySelector('.spinner');
    
    courseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Show loading state
      submitBtn.disabled = true;
      btnText.textContent = 'Submitting...';
      spinner.classList.remove('hidden');
      
      try {
        // Get form values
        const title = courseForm.querySelector('#title')?.value || 'Untitled Course';
        const instructor = courseForm.querySelector('#instructor')?.value || 'Anonymous';
        
        if (!title || !instructor) {
          throw new Error('Please fill in all required fields');
        }
        
        // Get video data if available
        let videoData = null;
        const videoElement = courseForm.querySelector('video');
        if (videoElement && videoElement.src) {
          // If we already have a recorded video, use it
          videoData = videoElement.src;
        }
        
        const formData = {
          id: 'course-' + Date.now(),
          type: 'course',
          status: 'pending',
          submittedAt: new Date().toISOString(),
          title: title,
          instructor: instructor,
          videoData: videoData,
          timestamp: new Date().toISOString()
        };
        
        console.log('Submitting course:', formData);
        
        // Store the course submission
        const stored = storeSubmission(formData);
        
        if (stored) {
          // Show success message
          alert('Your course has been submitted for review! It will appear after approval.');
          courseForm.reset();
          
          // Update the admin panel if it's open
          if (window.updateAdminPanel) {
            window.updateAdminPanel();
          }
          
          // Hide the form after successful submission
          const creatorInline = document.querySelector('.creator-inline');
          if (creatorInline) creatorInline.classList.add('hidden');
          
        } else {
          throw new Error('Failed to store submission');
        }
        
      } catch (error) {
        console.error('Error submitting course:', error);
        alert(error.message || 'There was an error submitting your course. Please try again.');
      } catch (error) {
        console.error('Error submitting course:', error);
        alert(error.message || 'There was an error submitting your course. Please try again.');
      } finally {
        // Clean up video element
        const videoElement = courseForm.querySelector('video');
        if (videoElement) {
          if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
          }
          videoElement.src = '';
        }
        
        // Reset UI state
        submitBtn.disabled = false;
        btnText.textContent = 'Submit for Review';
        spinner.classList.add('hidden');
        
        // Update the admin panel if it's open
        if (window.updateAdminPanel) {
          window.updateAdminPanel();
        }
      }
    });
  }
    if (e.target === successModal) {
      successModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
});
