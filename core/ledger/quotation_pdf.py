from django.http import HttpResponse
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from io import BytesIO
from decimal import Decimal
import os
import math


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
    
    # Subtitle and Date row (client company for this quotation)
    client_name = quotation.company.name if quotation.company else ''
    subtitle_date_data = [
        [Paragraph(client_name, company_subtitle_style), 
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
    
    # Build PDF with watermark and footer on each page
    doc.build(elements, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)
    
    # Get the value of the BytesIO buffer and write it to the response
    pdf = buffer.getvalue()
    buffer.close()
    response.write(pdf)
    
    return response


def add_watermark(canvas, doc):
    """Add company watermark to each page - repeats multiple times across the page"""
    canvas.saveState()
    
    # Set watermark properties - semi-transparent and rotated
    watermark_text = "HAQ BAHOO MIAN & COMPANY"
    
    # Page dimensions and margins
    page_width = A4[0]  # 595.27 points
    page_height = A4[1]  # 841.89 points
    margin = 40  # Same as doc margins
    footer_height = 60  # Footer space
    
    # Calculate usable area (accounting for margins and footer)
    usable_width = page_width - (2 * margin)
    usable_height = page_height - (2 * margin) - footer_height
    
    # Use a conservative rotation angle (20 degrees) for better fit
    rotation_angle = 20
    angle_rad = math.radians(rotation_angle)
    cos_angle = math.cos(angle_rad)
    
    # Calculate maximum text width that fits within page boundaries
    # When rotated at angle θ, text width projects as: text_width * cos(θ) horizontally
    # We need this to fit in usable_width with safety margin
    # Use 50% of usable width since we'll repeat it multiple times
    max_horizontal_projection = usable_width * 0.50
    max_text_width = max_horizontal_projection / cos_angle
    
    # Find font size that fits the text within max_text_width
    # Start with a reasonable size and scale down if needed
    font_size = 28
    canvas.setFont('Helvetica-Bold', font_size)
    text_width = canvas.stringWidth(watermark_text, 'Helvetica-Bold', font_size)
    
    # Scale down font if text is too wide
    if text_width > max_text_width:
        scale_factor = (max_text_width / text_width) * 0.90  # 90% safety margin
        font_size = max(18, int(font_size * scale_factor))  # Minimum 18pt
        canvas.setFont('Helvetica-Bold', font_size)
        text_width = canvas.stringWidth(watermark_text, 'Helvetica-Bold', font_size)
    
    # Calculate text height for spacing
    text_height = font_size * 1.2
    
    # Set semi-transparent gray color for watermark
    canvas.setFillColor(colors.HexColor('#999999'))  # Medium gray for better visibility
    canvas.setFillAlpha(0.25)  # 25% opacity - visible but not intrusive
    
    # Calculate spacing for repeating pattern
    # Create a grid pattern: 3 rows x 3 columns = 9 watermarks
    rows = 3
    cols = 3
    
    # Calculate spacing between watermarks
    # Account for rotated text dimensions
    spacing_x = usable_width / (cols + 1)
    spacing_y = usable_height / (rows + 1)
    
    # Starting position (top-left of usable area)
    start_x = margin + spacing_x
    start_y = margin + spacing_y
    
    # Draw watermark at each grid position
    for row in range(rows):
        for col in range(cols):
            # Calculate position for this watermark
            x = start_x + (col * spacing_x)
            y = start_y + (row * spacing_y)
            
            # Save state for this watermark
            canvas.saveState()
            
            # Translate to watermark position and rotate
            canvas.translate(x, y)
            canvas.rotate(rotation_angle)
            
            # Draw watermark text centered at origin
            canvas.drawCentredString(-text_width/2, 0, watermark_text)
            
            # Restore state for next watermark
            canvas.restoreState()
    
    canvas.restoreState()


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


def add_page_decorations(canvas, doc):
    """Add both watermark and footer to each page"""
    # Add watermark first (behind content)
    add_watermark(canvas, doc)
    # Add footer on top
    add_footer(canvas, doc)
