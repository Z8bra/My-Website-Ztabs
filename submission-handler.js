document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('submissionForm');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');
  const successModal = document.getElementById('successModal');
  const modalCloseBtns = document.querySelectorAll('.close-modal, .modal-close-btn');

  if (!form) return;

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.textContent = 'Sending...';
    spinner.classList.remove('hidden');
    
    try {
      // Get form data
      const formData = {
        type: form.type.value,
        title: form.title.value,
        artist: form.artist.value,
        content: form.content.value,
        email: form.email.value || 'Not provided',
        notes: form.notes.value || 'No additional notes',
        timestamp: new Date().toISOString()
      };

      // Send email using EmailJS
      await emailjs.send(
        'service_vmy1rm5',     // Replace with your EmailJS service ID
        'template_rgxty26',    // Replace with your EmailJS template ID
        {
          to_email: 'zanedewar@gmail.com', // Your email to receive submissions
          from_name: formData.artist,
          from_email: formData.email || 'no-email@example.com',
          subject: `New ${formData.type} Submission: ${formData.title}`,
          message: `New ${formData.type} submission received:\n\n` +
                  `Title: ${formData.title}\n` +
                  `Artist/Instructor: ${formData.artist}\n` +
                  `Submitted by: ${formData.email || 'Anonymous'}\n` +
                  `Submission Type: ${formData.type}\n` +
                  `Notes: ${formData.notes}\n\n` +
                  `Content Preview:\n${formData.content.substring(0, 200)}${formData.content.length > 200 ? '...' : ''}`
        }
      );

      // Show success message
      showSuccessModal();
      form.reset();
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('There was an error submitting your form. Please try again later.');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      btnText.textContent = 'Submit for Review';
      spinner.classList.add('hidden');
    }
  });

  // Show success modal
  function showSuccessModal() {
    successModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  // Close modal handlers
  modalCloseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      successModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    });
  });

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === successModal) {
      successModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
});
