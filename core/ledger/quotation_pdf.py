from django.http import HttpResponse
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas
from io import BytesIO
from decimal import Decimal
import os


def generate_quotation_pdf(quotation):
    """Generate PDF for a quotation matching the company format"""
    # Create the HttpResponse object with PDF headers
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="quotation_{quotation.quotation_number}.pdf"'
    
    # Create the PDF object using BytesIO buffer
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40,
                           topMargin=40, bottomMargin=60)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Company header style
    company_name_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=colors.black,
        spaceAfter=2,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        leading=32
    )
    
    company_subtitle_style = ParagraphStyle(
        'CompanySubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        spaceAfter=20,
        alignment=TA_LEFT,
        fontName='Helvetica'
    )
    
    date_style = ParagraphStyle(
        'DateStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        alignment=TA_RIGHT,
        fontName='Helvetica'
    )
    
    subject_style = ParagraphStyle(
        'SubjectStyle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.black,
        spaceAfter=10,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )
    
    quotation_heading_style = ParagraphStyle(
        'QuotationHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.black,
        spaceAfter=10,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        leading=20
    )
    
    item_title_style = ParagraphStyle(
        'ItemTitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.black,
        spaceAfter=8,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold',
        underline=True
    )
    
    item_desc_style = ParagraphStyle(
        'ItemDesc',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        spaceAfter=4,
        alignment=TA_LEFT,
        fontName='Helvetica',
        leftIndent=20
    )
    
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.white,
        alignment=TA_CENTER,
        fontName='Helvetica'
    )
    
    # Header with company name
    header_data = [
        [Paragraph('<b>HAQ BAHOO MIAN & COMPANY</b>', company_name_style)],
    ]
    header_table = Table(header_data, colWidths=[7*inch])
    header_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 2, colors.black),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    
    # Subtitle and Date row
    subtitle_date_data = [
        [Paragraph('SULTANIA FEED MILL', company_subtitle_style), 
         Paragraph(f'DATE  {quotation.quotation_date.strftime("%d/%m/%Y")}', date_style)]
    ]
    subtitle_date_table = Table(subtitle_date_data, colWidths=[4*inch, 3*inch])
    elements.append(subtitle_date_table)
    elements.append(Spacer(1, 20))
    
    # Subject and Quotation heading
    subject_quotation_data = [
        [Paragraph('SUBJECT', subject_style), 
         Paragraph('<b>Q U O T A T I O N</b>', quotation_heading_style)]
    ]
    subject_quotation_table = Table(subject_quotation_data, colWidths=[1.5*inch, 5.5*inch])
    elements.append(subject_quotation_table)
    elements.append(Spacer(1, 15))
    
    # Items section
    for idx, item in enumerate(quotation.items.all(), 1):
        # Item title with rate
        item_title = Paragraph(f'<i>FOR {item.item_name.upper()}</i>', item_title_style)
        elements.append(item_title)
        elements.append(Spacer(1, 8))
        
        # Item description
        if item.description:
            desc_lines = item.description.split('\n')
            for line_idx, line in enumerate(desc_lines, 1):
                desc_para = Paragraph(f'{line_idx}. {line}', item_desc_style)
                elements.append(desc_para)
        
        # Rate aligned to right
        rate_data = [
            ['', f'RATE', f'{float(item.subtotal):,.0f}/-']
        ]
        rate_table = Table(rate_data, colWidths=[4*inch, 1.5*inch, 1.5*inch])
        rate_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (-1, 0), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
        ]))
        elements.append(rate_table)
        elements.append(Spacer(1, 15))
    
    # Total
    total_data = [
        ['TOTAL', f'{float(quotation.total_amount):,.0f}/-']
    ]
    total_table = Table(total_data, colWidths=[5.5*inch, 1.5*inch])
    total_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('LINEABOVE', (0, 0), (-1, 0), 1, colors.black),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
    ]))
    elements.append(total_table)
    
    # Build PDF
    doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
    
    # Get the value of the BytesIO buffer and write it to the response
    pdf = buffer.getvalue()
    buffer.close()
    response.write(pdf)
    
    return response


def add_footer(canvas, doc):
    """Add footer to each page"""
    canvas.saveState()
    
    # Blue footer bar
    canvas.setFillColor(colors.HexColor('#1e3a8a'))
    canvas.rect(0, 0, A4[0], 60, fill=True, stroke=False)
    
    # Footer text
    canvas.setFillColor(colors.white)
    canvas.setFont('Helvetica', 9)
    
    # Address
    canvas.drawCentredString(A4[0]/2, 35, 
                            'Near Lohlianwali Nahr Opp Railway Line G.T Road Gujranwla')
    
    # Email and phone
    canvas.drawString(80, 20, '✉ Haqbahoomianco mpany@Gmail.com')
    canvas.drawString(A4[0] - 200, 20, '📞 +92 321 319 6814')
    
    canvas.restoreState()
