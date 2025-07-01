document.addEventListener('DOMContentLoaded', () => {
    const currentMonthYear = document.getElementById('currentMonthYear');
    const calendarGrid = document.getElementById('calendarGrid');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');

    let date = new Date();

    const renderCalendar = () => {
        date.setDate(1);
        const firstDayIndex = date.getDay();
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const prevLastDay = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
        const lastDayIndex = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDay();
        const nextDays = 7 - lastDayIndex - 1;

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        currentMonthYear.innerHTML = `${months[date.getMonth()]} ${date.getFullYear()}`;

        let days = "";
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        weekdays.forEach(day => {
            days += `<div class="calendar-day header">${day}</div>`;
        });

        for (let i = 1; i <= lastDay; i++) {
             if (i === new Date().getDate() && date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear()) {
                days += `<div class="calendar-day today">${i}</div>`;
            } else {
                days += `<div class="calendar-day">${i}</div>`;
            }
        }
        calendarGrid.innerHTML = days;
    };

    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => {
        date.setMonth(date.getMonth() - 1);
        renderCalendar();
    });

    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => {
        date.setMonth(date.getMonth() + 1);
        renderCalendar();
    });

    renderCalendar();
});