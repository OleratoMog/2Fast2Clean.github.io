// main.js
document.addEventListener("DOMContentLoaded", () => {
  // 1) Set footer year automatically
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // 2) Simple booking "submission" on the front-end
  const bookingForm = document.querySelector("#booking .booking-form");
  const bookingBtn = document.querySelector("#booking .btnn.wide");

  if (bookingForm && bookingBtn) {
    bookingBtn.addEventListener("click", (e) => {
      e.preventDefault(); // stop any page reload

      const inputs = bookingForm.querySelectorAll("input, select");
      const [nameInput, phoneInput, serviceSelect, dateInput, timeInput] = inputs;

      let error = "";

      if (!nameInput.value.trim()) {
        error = "Please enter your name.";
      } else if (!phoneInput.value.trim()) {
        error = "Please enter your phone number.";
      } else if (!dateInput.value) {
        error = "Please choose a preferred date.";
      } else if (!timeInput.value) {
        error = "Please choose a preferred time.";
      }

      let msgEl = bookingForm.querySelector(".booking-message");
      if (!msgEl) {
        msgEl = document.createElement("p");
        msgEl.className = "booking-message";
        bookingForm.appendChild(msgEl);
      }

      if (error) {
        msgEl.textContent = error;
        msgEl.style.color = "#f97373"; // red-ish
      } else {
        msgEl.textContent =
          "Thank you! Your booking request has been captured (demo only). We’ll confirm your slot via SMS / WhatsApp.";
        msgEl.style.color = "#4ade80"; // green

        // Clear form fields
        inputs.forEach((el) => (el.value = ""));
      }
    });
  }
});
