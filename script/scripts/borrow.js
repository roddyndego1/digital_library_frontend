// Use window.BACKEND_URL - declared once in auth.js (loaded first)
// No local declaration needed, just use window.BACKEND_URL directly

document.addEventListener('DOMContentLoaded', function () {
    const token = auth.getToken();
    if (!token) {
        alert('Please login to view your borrow history');
        window.location.href = 'index.html';
        return;
    }

    const user = auth.getUser();
    const userWelcome = document.getElementById('userWelcome');
    if (user && user.email && userWelcome) {
        const displayName = user.name || user.email.split('@')[0];
        userWelcome.textContent = `Welcome back, ${displayName}`;
    }

    loadBorrowHistory();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            auth.logout();
            window.location.href = 'index.html';
        });
    }
});

async function loadBorrowHistory() {
    const token = auth.getToken();
    if (!token) return;

    const currentLoading = document.getElementById('currentLoading');
    const historyLoading = document.getElementById('historyLoading');
    const dueSoonLoading = document.getElementById('dueSoonLoading');
    const noCurrentBorrows = document.getElementById('noCurrentBorrows');
    const noHistory = document.getElementById('noHistory');
    const noDueSoon = document.getElementById('noDueSoon');
    
    if (currentLoading) currentLoading.style.display = 'block';
    if (historyLoading) historyLoading.style.display = 'block';
    if (dueSoonLoading) dueSoonLoading.style.display = 'block';
    
    if (noCurrentBorrows) noCurrentBorrows.style.display = 'none';
    if (noHistory) noHistory.style.display = 'none';
    if (noDueSoon) noDueSoon.style.display = 'none';

    try {
        const response = await fetch(`${window.BACKEND_URL}/my-borrows`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load borrow history: ${response.status}`);
        }

        const borrows = await response.json();
        displayBorrowHistory(borrows);
    } catch (error) {
        handleBorrowHistoryError();
    } finally {
        if (currentLoading) currentLoading.style.display = 'none';
        if (historyLoading) historyLoading.style.display = 'none';
        if (dueSoonLoading) dueSoonLoading.style.display = 'none';
    }
}

function handleBorrowHistoryError() {
    const currentBorrows = document.getElementById('currentBorrows');
    const borrowHistory = document.getElementById('borrowHistory');
    
    if (currentBorrows) {
        currentBorrows.innerHTML = '<div class="error message">Error loading current borrows. Please try again.</div>';
    }
    
    if (borrowHistory) {
        borrowHistory.innerHTML = '<div class="error message">Error loading borrow history. Please try again.</div>';
    }
    
    updateStatCards(0, 0, 0);
}

function displayBorrowHistory(borrows) {
    const currentBorrowsContainer = document.getElementById('currentBorrows');
    const borrowHistoryContainer = document.getElementById('borrowHistory');
    const dueSoonContainer = document.getElementById('dueSoon');

    if (!borrows || !Array.isArray(borrows)) {
        showNoDataMessages();
        return;
    }

    const currentBorrows = borrows.filter(b => b.status === 'borrowed' || b.status === 'active');
    const returnedBooks = borrows.filter(b => b.status === 'returned');
    const dueSoonBorrows = getDueSoonBorrows(currentBorrows);

    updateStatCards(currentBorrows.length, dueSoonBorrows.length, returnedBooks.length);

    displayCurrentBorrows(currentBorrows, currentBorrowsContainer);
    displayDueSoonBorrows(dueSoonBorrows, dueSoonContainer);
    displayBorrowHistoryList(returnedBooks, borrowHistoryContainer);
}

function getDueSoonBorrows(borrows) {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    return borrows.filter(borrow => {
        try {
            const dueDate = new Date(borrow.due_date);
            return dueDate >= today && dueDate <= threeDaysFromNow;
        } catch {
            return false;
        }
    });
}

function updateStatCards(currentCount, dueSoonCount, returnedCount) {
    const currentCountEl = document.getElementById('currentBorrowsCount');
    const dueSoonCountEl = document.getElementById('dueSoonCount');
    const returnedCountEl = document.getElementById('returnedCount');
    
    if (currentCountEl) currentCountEl.textContent = currentCount;
    if (dueSoonCountEl) dueSoonCountEl.textContent = dueSoonCount;
    if (returnedCountEl) returnedCountEl.textContent = returnedCount;
}

function displayCurrentBorrows(borrows, container) {
    if (!container) return;
    
    const noCurrentBorrows = document.getElementById('noCurrentBorrows');
    
    if (!borrows || borrows.length === 0) {
        container.innerHTML = '';
        if (noCurrentBorrows) noCurrentBorrows.style.display = 'block';
        return;
    }

    if (noCurrentBorrows) noCurrentBorrows.style.display = 'none';

    container.innerHTML = borrows.map(borrow => formatBorrowItem(borrow, true)).join('');
}

function displayDueSoonBorrows(borrows, container) {
    if (!container) return;
    
    const noDueSoon = document.getElementById('noDueSoon');
    
    if (!borrows || borrows.length === 0) {
        container.innerHTML = '';
        if (noDueSoon) noDueSoon.style.display = 'block';
        return;
    }

    if (noDueSoon) noDueSoon.style.display = 'none';
    container.innerHTML = borrows.map(borrow => formatBorrowItem(borrow, false)).join('');
}

function formatBorrowItem(borrow, showReturnButton = false) {
    try {
        const borrowDate = new Date(borrow.borrow_date || borrow.created_at);
        const dueDate = new Date(borrow.due_date);
        const today = new Date();
        
        const isOverdue = dueDate < today;
        const isDueSoon = !isOverdue && (dueDate - today) / (1000 * 60 * 60 * 24) <= 3;
        
        const borrowDateStr = formatDate(borrowDate);
        const dueDateStr = formatDate(dueDate, true);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        const statusHtml = isOverdue 
            ? `<p class="status-overdue"><i class="fas fa-exclamation-triangle"></i> OVERDUE by ${Math.abs(daysUntilDue)} days</p>`
            : isDueSoon
            ? `<p class="status-due-soon"><i class="fas fa-clock"></i> Due in ${daysUntilDue} days</p>`
            : `<p class="status-ok"><i class="fas fa-check-circle"></i> Due in ${daysUntilDue} days</p>`;
        
        const returnButton = showReturnButton 
            ? `<button class="return-btn" onclick="returnBook(${borrow.id})" title="Return this book">
                <i class="fas fa-undo"></i> Return
            </button>`
            : '';
        
        return `
            <div class="borrow-item ${isOverdue ? 'overdue' : (isDueSoon ? 'due-soon' : '')}">
                <div class="borrow-info">
                    <h4>${escapeHtml(borrow.book_title || `Book ID: ${borrow.book_id}`)}</h4>
                    ${borrow.book_author ? `<p class="book-author">${escapeHtml(borrow.book_author)}</p>` : ''}
                    <div class="borrow-dates">
                        <p><strong><i class="fas fa-calendar-plus"></i> Borrowed:</strong> ${borrowDateStr}</p>
                        <p><strong><i class="fas fa-calendar-times"></i> Due:</strong> ${dueDateStr}</p>
                        ${statusHtml}
                    </div>
                </div>
                ${returnButton}
            </div>
        `;
    } catch (error) {
        return `
            <div class="borrow-item error">
                <div class="borrow-info">
                    <h4>Error displaying book</h4>
                    <p>Book ID: ${borrow.book_id || 'Unknown'}</p>
                </div>
            </div>
        `;
    }
}

function displayBorrowHistoryList(borrows, container) {
    if (!container) return;
    
    const noHistory = document.getElementById('noHistory');
    
    if (!borrows || borrows.length === 0) {
        container.innerHTML = '';
        if (noHistory) noHistory.style.display = 'block';
        return;
    }

    if (noHistory) noHistory.style.display = 'none';

    container.innerHTML = borrows.map(borrow => formatHistoryItem(borrow)).join('');
}

function formatHistoryItem(borrow) {
    try {
        const borrowDate = new Date(borrow.borrow_date || borrow.created_at);
        const dueDate = new Date(borrow.due_date);
        const returnDate = borrow.return_date ? new Date(borrow.return_date) : null;
        const wasOverdue = returnDate && (returnDate > dueDate);
        
        const borrowDateStr = formatDate(borrowDate);
        const dueDateStr = formatDate(dueDate);
        const returnDateStr = returnDate ? formatDate(returnDate) : 'Not returned';

        return `
            <div class="history-item ${wasOverdue ? 'overdue' : ''}">
                <div class="borrow-info">
                    <h4>${escapeHtml(borrow.book_title || `Book ID: ${borrow.book_id}`)}</h4>
                    ${borrow.book_author ? `<p class="book-author">${escapeHtml(borrow.book_author)}</p>` : ''}
                    <div class="borrow-dates">
                        <div class="date-row">
                            <span><i class="fas fa-calendar-plus"></i> <strong>Borrowed:</strong> ${borrowDateStr}</span>
                            <span><i class="fas fa-calendar-times"></i> <strong>Due:</strong> ${dueDateStr}</span>
                        </div>
                        <div class="date-row">
                            <span><i class="fas fa-calendar-check"></i> <strong>Returned:</strong> ${returnDateStr}</span>
                            ${wasOverdue 
                                ? '<span class="status-overdue"><i class="fas fa-exclamation-triangle"></i> Returned Late</span>'
                                : '<span class="status-returned"><i class="fas fa-check-circle"></i> Returned On Time</span>'
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        return `
            <div class="history-item error">
                <div class="borrow-info">
                    <h4>Error displaying book</h4>
                    <p>Book ID: ${borrow.book_id || 'Unknown'}</p>
                </div>
            </div>
        `;
    }
}

function formatDate(date, includeWeekday = false) {
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    if (includeWeekday) {
        options.weekday = 'short';
    }
    
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNoDataMessages() {
    const currentBorrows = document.getElementById('currentBorrows');
    const borrowHistory = document.getElementById('borrowHistory');
    
    if (currentBorrows) currentBorrows.innerHTML = '';
    if (borrowHistory) borrowHistory.innerHTML = '';
    
    const noCurrentBorrows = document.getElementById('noCurrentBorrows');
    const noHistory = document.getElementById('noHistory');
    
    if (noCurrentBorrows) noCurrentBorrows.style.display = 'block';
    if (noHistory) noHistory.style.display = 'block';
    
    updateStatCards(0, 0, 0);
}

async function returnBook(borrowId) {
    if (!borrowId) return;
    
    if (!confirm('Are you sure you want to return this book?')) {
        return;
    }

    const token = auth.getToken();
    if (!token) {
        alert('Please login to return books');
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`${window.BACKEND_URL}/return-borrow/${borrowId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            alert('Book returned successfully!');
            loadBorrowHistory();
        } else {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                alert(errorData.message || 'Error returning book');
            } catch {
                alert(`Error returning book: ${response.status} ${response.statusText}`);
            }
        }
    } catch (error) {
        alert('Error returning book. Please check your connection and try again.');
    }
}

window.returnBook = returnBook;
window.loadBorrowHistory = loadBorrowHistory;
