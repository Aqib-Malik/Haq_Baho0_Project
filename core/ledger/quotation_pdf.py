from django.http import HttpResponse
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
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
    
    # Logo path: try frontend assets, then project root static
    _script_dir = os.path.dirname(os.path.abspath(__file__))  # .../core/ledger
    _core_dir = os.path.dirname(_script_dir)                  # .../core
    _project_root = os.path.dirname(_core_dir)                # .../inventory_hr_system
    _logo_path = os.path.join(_project_root, 'frontend', 'public', 'assets', 'images', 'logo.jpeg')
    if not os.path.isfile(_logo_path):
        _logo_path = os.path.join(_project_root, 'assets', 'images', 'logo.jpeg')
    if not os.path.isfile(_logo_path):
        _logo_path = None

    # Header with logo and company name
    if _logo_path:
        try:
            logo_img = Image(_logo_path, width=1.0*inch, height=1.0*inch)
            header_data = [[logo_img, Paragraph('<b>HAQ BAHOO MIAN & COMPANY</b>', company_name_style)]]
            header_table = Table(header_data, colWidths=[1.2*inch, 5.8*inch])
        except Exception:
            header_data = [[Paragraph('<b>HAQ BAHOO MIAN & COMPANY</b>', company_name_style)]]
            header_table = Table(header_data, colWidths=[7*inch])
    else:
        header_data = [[Paragraph('<b>HAQ BAHOO MIAN & COMPANY</b>', company_name_style)]]
        header_table = Table(header_data, colWidths=[7*inch])

    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
        ('LINEBELOW', (0, 0), (-1, 0), 2, colors.black),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('RIGHTPADDING', (0, 0), (0, 0), 12),
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
    
    # Add Terms and Conditions page if notes exist
    if quotation.notes:
        elements.append(Spacer(1, 20))
        # Page break for terms page
        elements.append(PageBreak())
        
        # Terms and Conditions Header
        terms_header_style = ParagraphStyle(
            'TermsHeader',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.black,
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            leading=18
        )
        
        terms_title = Paragraph('GENERAL TERMS & CONDITION', terms_header_style)
        elements.append(terms_title)
        elements.append(Spacer(1, 15))
        
        # Terms content from notes
        terms_style = ParagraphStyle(
            'TermsStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            spaceAfter=8,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leftIndent=0,
            leading=14
        )
        
        # Split notes by newlines and create paragraphs
        notes_lines = quotation.notes.split('\n')
        for line in notes_lines:
            if line.strip():  # Only add non-empty lines
                terms_para = Paragraph(line.strip(), terms_style)
                elements.append(terms_para)
        
        elements.append(Spacer(1, 30))
        
        # Thanking you section
        thank_you_style = ParagraphStyle(
            'ThankYouStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.black,
            spaceAfter=30,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
            leading=14
        )
        
        thank_you = Paragraph('THANKING YOU.', thank_you_style)
        elements.append(thank_you)
        elements.append(Spacer(1, 20))
        
        # Signature section
        signature_style = ParagraphStyle(
            'SignatureStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            spaceAfter=5,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leading=14
        )
        
        yours_faithfully = Paragraph('Yours faithfully,', signature_style)
        elements.append(yours_faithfully)
        elements.append(Spacer(1, 5))
        
        company_sign_style = ParagraphStyle(
            'CompanySignStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.black,
            spaceAfter=20,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
            leading=14
        )
        
        company_sign = Paragraph('HAQ BAHOO MIAN & COMPANY', company_sign_style)
        elements.append(company_sign)
        elements.append(Spacer(1, 10))
        
        signature_line = Paragraph('Signature _________________', signature_style)
        elements.append(signature_line)
    
    # Build PDF with watermark and footer on each page
    doc.build(elements, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)
    
    # Get the value of the BytesIO buffer and write it to the response
    pdf = buffer.getvalue()
    buffer.close()
    response.write(pdf)
    
    return response


def add_watermark(canvas, doc):
    """Add company watermark to each page - diagonal repeating pattern"""
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
    
    # Use a diagonal rotation angle (30 degrees) for classic watermark look
    rotation_angle = 30
    angle_rad = math.radians(rotation_angle)
    cos_angle = math.cos(angle_rad)
    
    # Calculate maximum text width that fits within page boundaries
    # When rotated at angle θ, text width projects as: text_width * cos(θ) horizontally
    # Use 45% of usable width for each watermark instance
    max_horizontal_projection = usable_width * 0.45
    max_text_width = max_horizontal_projection / cos_angle
    
    # Find font size that fits the text within max_text_width
    font_size = 32
    canvas.setFont('Helvetica-Bold', font_size)
    text_width = canvas.stringWidth(watermark_text, 'Helvetica-Bold', font_size)
    
    # Scale down font if text is too wide
    if text_width > max_text_width:
        scale_factor = (max_text_width / text_width) * 0.90  # 90% safety margin
        font_size = max(20, int(font_size * scale_factor))  # Minimum 20pt
        canvas.setFont('Helvetica-Bold', font_size)
        text_width = canvas.stringWidth(watermark_text, 'Helvetica-Bold', font_size)
    
    # Calculate text height for spacing
    text_height = font_size * 1.2
    
    # Set semi-transparent gray color for watermark
    canvas.setFillColor(colors.HexColor('#999999'))  # Medium gray for better visibility
    canvas.setFillAlpha(0.25)  # 25% opacity - visible but not intrusive
    
    # Create diagonal repeating pattern - staggered grid
    # Calculate spacing for diagonal rows
    # Each watermark needs space: text_width * cos(angle) horizontally
    horizontal_projection = text_width * cos_angle
    vertical_projection = text_height * math.sin(angle_rad)
    
    # Spacing between watermarks (with some overlap for continuous effect)
    spacing_x = horizontal_projection * 1.2  # 20% spacing between horizontal positions
    spacing_y = text_height * 1.8  # Vertical spacing between rows
    
    # Calculate number of rows and columns
    num_rows = int(usable_height / spacing_y) + 3
    num_cols = int(usable_width / spacing_x) + 3
    
    # Starting position (slightly offset to center the pattern)
    start_x = margin - spacing_x * 0.5
    start_y = margin - spacing_y * 0.5
    
    # Draw watermarks in staggered diagonal pattern
    for row in range(num_rows):
        for col in range(num_cols):
            # Calculate position with staggered offset for diagonal effect
            # Offset odd rows to create diagonal pattern
            x_offset = (spacing_x * 0.6) if (row % 2 == 1) else 0
            x = start_x + (col * spacing_x) + x_offset
            y = start_y + (row * spacing_y)
            
            # Only draw if within page boundaries
            if (x > margin - 50 and x < page_width - margin + 50 and 
                y > margin - 50 and y < page_height - margin - footer_height + 50):
                
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
    
    # Address (top line)
    canvas.drawCentredString(A4[0]/2, 38,
                            'Near Lohlianwali Nahr Opp Railway Line G.T Road Gujranwla')
    
    # Website (second line)
    canvas.drawCentredString(A4[0]/2, 24, 'https://haqbahoomianco.com/')
    
    # Email and phone (bottom line)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(80, 10, 'Haqbahoomiancompany@Gmail.com')
    canvas.drawString(A4[0] - 200, 10, '+92 321 319 6814')
    
    canvas.restoreState()


def add_page_decorations(canvas, doc):
    """Add both watermark and footer to each page"""
    # Add watermark first (behind content)
    add_watermark(canvas, doc)
    # Add footer on top
    add_footer(canvas, doc)
