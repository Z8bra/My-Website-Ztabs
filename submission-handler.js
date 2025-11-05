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
  function storeSubmission(submission) {
    try {
      const submissions = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
      submissions.push(submission);
      localStorage.setItem('pendingSubmissions', JSON.stringify(submissions));
      console.log('Submission stored:', submission);
      return true;
    } catch (error) {
      console.error('Error storing submission:', error);
      return false;
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
          email: 'submission@example.com', // Default email since field is hidden
          timestamp: new Date().toISOString(),
          views: 0,
          likes: 0
        };
        
        console.log('Submitting tab:', formData);
        
        // Store the tab submission
        const stored = storeSubmission(formData);
        
        if (stored) {
          // Show success message
          showSuccess('Your tab has been submitted for review! It will appear after approval.');
          tabForm.reset();
          
          // Update the admin panel if it's open
          if (window.updateAdminPanel) {
            window.updateAdminPanel();
          }
          
          // Refresh the tabs list if on the tabs page
          if (window.loadTabs) {
            window.loadTabs();
          }
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
        // Get the video blob if available
        let videoData = null;
        const videoElement = courseForm.querySelector('video');
        if (videoElement && videoElement.srcObject) {
          try {
            const stream = videoElement.srcObject;
            const recorder = new MediaRecorder(stream);
            const chunks = [];
            
            videoData = await new Promise((resolve) => {
              recorder.ondataavailable = (e) => chunks.push(e.data);
              recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              };
              recorder.start();
              setTimeout(() => {
                recorder.stop();
                stream.getTracks().forEach(track => track.stop());
              }, 1000); // Capture 1 second of video
            });
          } catch (error) {
            console.error('Error capturing video:', error);
            // Continue without video if there's an error
          }
        }
        
        const formData = {
          id: 'course-' + Date.now(),
          type: 'course',
          status: 'pending',
          submittedAt: new Date().toISOString(),
          title: courseForm.querySelector('#courseTitle')?.value || 'Untitled Course',
          instructor: courseForm.querySelector('#courseAuthor').value,
          email: courseForm.querySelector('#courseEmail').value,
          tabId: courseForm.querySelector('#courseTabSelect').value,
          videoData: videoData,
          timestamp: new Date().toISOString()
        };
        
        // Store the course submission
        storeSubmission(formData);
        
        // Show success message
        showSuccess('Your course has been submitted for review! It will appear after approval.');
        courseForm.reset();
        
        // Reset video element
        const videoElement = courseForm.querySelector('video');
        if (videoElement) {
          videoElement.srcObject = null;
          videoElement.src = '';
        }
        
        // Update the admin panel if it's open
        if (window.updateAdminPanel) {
          window.updateAdminPanel();
        }
        
      } catch (error) {
        console.error('Error submitting course:', error);
        alert('There was an error submitting your course. Please try again.');
      } finally {
        submitBtn.disabled = false;
        btnText.textContent = 'Submit for Review';
        spinner.classList.add('hidden');
      }
    });
  }
    if (e.target === successModal) {
      successModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
});
