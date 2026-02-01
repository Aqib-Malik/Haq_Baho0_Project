ssh -i ~/Downloads/django-key.pem ubuntu@16.170.24.40 "
cd ~/Haq_Baho0_Project &&
source venv/bin/activate &&
git pull origin main &&
cd core &&
pip install -r ../requirements.txt &&
python manage.py makemigrations &&
python manage.py migrate &&
python manage.py collectstatic --noinput &&
# Run the specific population script
python manage.py populate_units &&
sudo systemctl restart gunicorn &&
sudo systemctl reload nginx
"
