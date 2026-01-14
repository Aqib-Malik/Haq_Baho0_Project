# Inventory & HR System - Company Ledger Module

A modern Django + Angular application for managing company ledgers with automatic debit/credit calculations, running balance tracking, and PDF/Excel export functionality.

## Features

- **Company Management**: Create and manage companies with complete contact information
- **Invoice Management**: Track debit entries (invoices)
- **Payment Management**: Track credit entries (payments)
- **Automatic Ledger Calculation**: Automatic running balance calculation
- **Date Range Filtering**: Filter ledger entries by date range
- **PDF Export**: Export company ledger as PDF
- **Excel Export**: Export company ledger as Excel
- **Outstanding Balance Calculation**: Formula: Outstanding Balance = Total Invoices - Total Payments
- **Modern UI**: Beautiful, responsive Angular Material design

## Project Structure

```
inventory_hr_system/
├── core/                 # Django backend
│   ├── core/            # Django project settings
│   ├── ledger/          # Ledger app
│   └── manage.py
└── frontend/            # Angular frontend
    └── src/
        └── app/
            ├── components/
            │   └── ledger/
            ├── models/
            └── services/
```

## Setup Instructions

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup (Django)

1. Navigate to the core directory:
```bash
cd core
```

2. Create and activate virtual environment (if not already done):
```bash
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run migrations:
```bash
python manage.py migrate
```

5. Create superuser (optional, for Django admin):
```bash
python manage.py createsuperuser
```

6. Start Django development server:
```bash
python manage.py runserver
```

The Django API will be available at `http://localhost:8000`

### Frontend Setup (Angular)

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start Angular development server:
```bash
npm start
# or
ng serve
```

The Angular app will be available at `http://localhost:4200`

## API Endpoints

### Companies
- `GET /api/companies/` - List all companies
- `GET /api/companies/{id}/` - Get company details
- `POST /api/companies/` - Create new company
- `PUT /api/companies/{id}/` - Update company
- `DELETE /api/companies/{id}/` - Delete company
- `GET /api/companies/search/?q={query}` - Search companies

### Invoices
- `GET /api/invoices/` - List all invoices
- `GET /api/invoices/?company={id}` - List invoices for a company
- `POST /api/invoices/` - Create new invoice
- `PUT /api/invoices/{id}/` - Update invoice
- `DELETE /api/invoices/{id}/` - Delete invoice

### Payments
- `GET /api/payments/` - List all payments
- `GET /api/payments/?company={id}` - List payments for a company
- `POST /api/payments/` - Create new payment
- `PUT /api/payments/{id}/` - Update payment
- `DELETE /api/payments/{id}/` - Delete payment

### Ledger
- `GET /api/ledger/company_ledger/?company={id}&start_date={date}&end_date={date}` - Get company ledger with running balance
- `GET /api/ledger/export_pdf/?company={id}&start_date={date}&end_date={date}` - Export ledger as PDF
- `GET /api/ledger/export_excel/?company={id}&start_date={date}&end_date={date}` - Export ledger as Excel
- `GET /api/ledger/outstanding_balance/?company={id}` - Get outstanding balance

## Usage

1. **Add Companies**: Use Django admin or API to add companies
2. **Add Invoices**: Create invoices (debit entries) for companies
3. **Add Payments**: Record payments (credit entries) from companies
4. **View Ledger**: Select a company and view its ledger with running balance
5. **Filter by Date**: Use start and end date filters to view specific periods
6. **Export**: Export ledger data as PDF or Excel

## Ledger Formula

**Outstanding Balance = Total Invoices (Debit) - Total Payments (Credit)**

The system automatically calculates:
- Opening Balance (balance before start date if filtered)
- Total Debit (sum of all invoices)
- Total Credit (sum of all payments)
- Closing Balance (Opening + Debit - Credit)
- Running Balance (calculated for each transaction)

## Technologies Used

### Backend
- Django 6.0.1
- Django REST Framework
- Django CORS Headers
- ReportLab (PDF generation)
- OpenPyXL (Excel generation)
- SQLite (default database)

### Frontend
- Angular 21
- Angular Material
- RxJS
- TypeScript

## Development

### Running Tests

**Django:**
```bash
cd core
python manage.py test
```

**Angular:**
```bash
cd frontend
npm test
```

### Building for Production

**Django:**
```bash
cd core
python manage.py collectstatic
```

**Angular:**
```bash
cd frontend
npm run build
```

## Notes

- The system automatically creates ledger entries when invoices or payments are created/updated/deleted
- All amounts are stored as Decimal for precision
- Date filtering is optional - if not provided, all transactions are included
- PDF and Excel exports include company information, summary, and all transaction details

## License

This project is part of the Inventory & HR System.
