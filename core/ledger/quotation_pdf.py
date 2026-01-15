from django.http import HttpResponse
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas
from io import BytesIO
from decimal import Decimal


def generate_quotation_pdf(quotation):
    """Generate PDF for a quotation"""
    # Create the HttpResponse object with PDF headers
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="quotation_{quotation.quotation_number}.pdf"'
    
    # Create the PDF object using BytesIO buffer
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30,
                           topMargin=30, bottomMargin=30)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#334155'),
    )
    
    # Title
    title = Paragraph(f"<b>QUOTATION</b>", title_style)
    elements.append(title)
    elements.append(Spacer(1, 12))
    
    # Quotation details
    details_data = [
        ['Quotation #:', quotation.quotation_number, 'Date:', quotation.quotation_date.strftime('%d %b, %Y')],
        ['Company:', quotation.company.name, 'Valid Until:', quotation.valid_until.strftime('%d %b, %Y') if quotation.valid_until else 'N/A'],
        ['Status:', quotation.get_status_display(), '', ''],
    ]
    
    details_table = Table(details_data, colWidths=[1.5*inch, 2.5*inch, 1.5*inch, 2*inch])
    details_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#334155')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(details_table)
    elements.append(Spacer(1, 20))
    
    # Items heading
    items_heading = Paragraph("<b>Items</b>", heading_style)
    elements.append(items_heading)
    elements.append(Spacer(1, 10))
    
    # Items table
    items_data = [['#', 'Item', 'Qty', 'Unit', 'Rate (Rs)', 'Amount (Rs)']]
    
    for idx, item in enumerate(quotation.items.all(), 1):
        items_data.append([
            str(idx),
            f"{item.item_name}\n{item.description if item.description else ''}",
            str(item.quantity),
            item.unit,
            f"{float(item.unit_price):,.2f}",
            f"{float(item.subtotal):,.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[0.5*inch, 3*inch, 0.8*inch, 0.8*inch, 1.2*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        
        # Body
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        
        # Padding
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # Totals section
    totals_data = [
        ['Subtotal:', f"Rs {float(quotation.subtotal):,.2f}"],
    ]
    
    if quotation.tax:
        totals_data.append([
            f'Tax ({quotation.tax.name} @ {quotation.tax.rate}%):', 
            f"Rs {float(quotation.tax_amount):,.2f}"
        ])
    
    if quotation.discount_value > 0:
        discount_label = f'Discount ({quotation.discount_value}%)' if quotation.discount_type == 'percentage' else 'Discount'
        totals_data.append([
            discount_label,
            f"- Rs {float(quotation.discount_amount):,.2f}"
        ])
    
    totals_data.append(['', ''])  # Separator
    totals_data.append([
        '<b>Total Amount:</b>',
        f"<b>Rs {float(quotation.total_amount):,.2f}</b>"
    ])
    
    totals_table = Table(totals_data, colWidths=[5.5*inch, 1.5*inch])
    totals_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#334155')),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#667eea')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    elements.append(totals_table)
    
    # Notes section
    if quotation.notes:
        elements.append(Spacer(1, 20))
        notes_heading = Paragraph("<b>Notes / Terms & Conditions</b>", heading_style)
        elements.append(notes_heading)
        elements.append(Spacer(1, 8))
        notes_text = Paragraph(quotation.notes.replace('\n', '<br/>'), normal_style)
        elements.append(notes_text)
    
    # Build PDF
    doc.build(elements)
    
    # Get the value of the BytesIO buffer and write it to the response
    pdf = buffer.getvalue()
    buffer.close()
    response.write(pdf)
    
    return response
