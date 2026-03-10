# מדריך העלאה ל-Production

## סיכום השינויים שבוצעו

### 1. קבצים שעודכנו עם כתובת Production

הקבצים הבאים עודכנו להשתמש ב-`https://your-app.onrender.com` במקום `http://localhost:3000`:

#### Extension Files:
- ✅ `src/content-scripts/content.ts` - קבוע BACKEND_API_URL
- ✅ `src/popup/PopupComponent.vue` - משתנה backendUrl
- ✅ `src/options/OptionsComponent.vue` - DEFAULT_CONFIG.backendApiUrl
- ✅ `extension/popup.html` - קבוע API
- ✅ `extension/options.html` - ערך ברירת מחדל של apiUrl

#### Manifest Files:
- ✅ `src/manifest.json` - host_permissions עודכן
- ✅ `extension/manifest.json` - host_permissions עודכן

### 2. קבצי תצורה חדשים ל-Backend

נוצרו הקבצים הבאים בתיקיית `backend/`:

- ✅ `Procfile` - עבור Render/Heroku
- ✅ `render.yaml` - תצורה אוטומטית ל-Render
- ✅ `railway.json` - תצורה ל-Railway
- ✅ `.env.example` - דוגמה למשתני סביבה
- ✅ `.gitignore` - למניעת העלאת קבצים רגישים
- ✅ `README.md` - הוראות פריסה מפורטות

## שלבי ההעלאה

### שלב 1: הכנת Backend להעלאה ל-GitHub

1. **פתח Terminal בתיקיית הפרויקט:**
```bash
cd c:\Users\ש\Downloads\vitaly-extension-master\ali-smart-finder\vitaly-extension-master\backend
```

2. **אתחל Git repository (אם עדיין לא קיים):**
```bash
git init
git add .
git commit -m "Prepare backend for production deployment"
```

3. **צור repository חדש ב-GitHub:**
   - לך ל-https://github.com/new
   - תן שם לrepository (למשל: `ali-smart-finder-backend`)
   - אל תוסיף README או .gitignore (כבר קיימים)
   - לחץ "Create repository"

4. **חבר את הקוד המקומי ל-GitHub:**
```bash
git remote add origin https://github.com/YOUR_USERNAME/ali-smart-finder-backend.git
git branch -M main
git push -u origin main
```

### שלב 2: העלאה ל-Render (מומלץ - חינמי)

1. **הירשם/התחבר ל-Render:**
   - לך ל-https://dashboard.render.com/
   - התחבר עם GitHub

2. **צור Web Service חדש:**
   - לחץ "New +" → "Web Service"
   - בחר את ה-repository שיצרת
   - הגדרות:
     - **Name**: `ali-smart-finder-api` (או כל שם אחר)
     - **Environment**: `Node`
     - **Region**: בחר אזור קרוב (Oregon/Frankfurt)
     - **Branch**: `main`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: `Free`

3. **הוסף משתני סביבה (Environment Variables):**
   - לחץ "Advanced" → "Add Environment Variable"
   - הוסף:
     ```
     NODE_ENV=production
     ALI_APP_KEY=your_actual_key_here
     ALI_APP_SECRET=your_actual_secret_here
     ```

4. **לחץ "Create Web Service"**

5. **המתן לפריסה:**
   - Render יבנה ויעלה את השרת אוטומטית
   - זה לוקח בערך 2-3 דקות
   - תקבל URL כמו: `https://ali-smart-finder-api.onrender.com`

### שלב 3: העלאה ל-Railway (אלטרנטיבה)

1. **הירשם/התחבר ל-Railway:**
   - לך ל-https://railway.app/
   - התחבר עם GitHub

2. **צור פרויקט חדש:**
   - לחץ "New Project"
   - בחר "Deploy from GitHub repo"
   - בחר את ה-repository שלך

3. **הוסף משתני סביבה:**
   - לחץ על השירות → "Variables"
   - הוסף:
     ```
     NODE_ENV=production
     ALI_APP_KEY=your_actual_key_here
     ALI_APP_SECRET=your_actual_secret_here
     ```

4. **Railway יעלה אוטומטית**
   - תקבל URL כמו: `https://your-app.railway.app`

### שלב 4: עדכון התוסף עם כתובת ה-Production האמיתית

לאחר שקיבלת את ה-URL האמיתי מ-Render או Railway, עליך לעדכן את הקבצים הבאים:

**החלף את `https://your-app.onrender.com` ב-URL האמיתי שלך בקבצים:**

1. `src/content-scripts/content.ts` - שורה 5
2. `src/popup/PopupComponent.vue` - שורה 125
3. `src/options/OptionsComponent.vue` - שורות 29, 37, 150
4. `extension/popup.html` - שורות 317, 363
5. `extension/options.html` - שורות 290, 395
6. `src/manifest.json` - שורה 42
7. `extension/manifest.json` - שורה 28

**דוגמה:**
```javascript
// לפני:
const BACKEND_API_URL = 'https://your-app.onrender.com';

// אחרי (עם ה-URL האמיתי שלך):
const BACKEND_API_URL = 'https://ali-smart-finder-api.onrender.com';
```

### שלב 5: בניית התוסף

1. **בנה את התוסף:**
```bash
cd c:\Users\ש\Downloads\vitaly-extension-master\ali-smart-finder\vitaly-extension-master
npm run build
```

2. **הקובץ המוכן להעלאה יהיה בתיקיית `dist/`**

### שלב 6: בדיקה

1. **בדוק שה-API עובד:**
   - פתח בדפדפן: `https://your-actual-url.onrender.com/health`
   - אמור להציג: `{"status":"healthy",...}`

2. **טען את התוסף ב-Chrome:**
   - Chrome → Extensions → Developer mode
   - Load unpacked → בחר תיקיית `dist/`
   - בדוק שהתוסף מתחבר לשרת

### שלב 7: העלאה ל-Chrome Web Store

1. לך ל-https://chrome.google.com/webstore/devconsole
2. לחץ "New Item"
3. העלה קובץ ZIP של תיקיית `dist/`
4. מלא את כל הפרטים הנדרשים
5. שלח לבדיקה

## טיפים חשובים

### 🔒 אבטחה
- **לעולם אל תעלה את קובץ `.env` ל-GitHub!**
- משתני הסביבה (API Keys) צריכים להיות רק בממשק של Render/Railway
- הקובץ `.gitignore` מונע העלאה מקרית

### 🚀 Render Free Tier
- השרת "ישן" אחרי 15 דקות ללא פעילות
- הבקשה הראשונה עלולה לקחת 30-60 שניות
- זה נורמלי לתוכנית החינמית

### 🔄 עדכונים עתידיים
כשתרצה לעדכן את ה-Backend:
```bash
cd backend
git add .
git commit -m "Update: description of changes"
git push
```
Render/Railway יעלו אוטומטית את הגרסה החדשה.

## בעיות נפוצות

### התוסף לא מתחבר לשרת
- ✅ בדוק שה-URL נכון בכל הקבצים
- ✅ בדוק שהשרת רץ: `https://your-url/health`
- ✅ בדוק ב-DevTools Console לשגיאות CORS

### שגיאות CORS
- ✅ ודא שה-`manifest.json` כולל את ה-URL בהרשאות
- ✅ בדוק שהשרת מאפשר בקשות מ-Chrome extensions

### השרת לא עולה
- ✅ בדוק את ה-logs ב-Render/Railway
- ✅ ודא שכל משתני הסביבה מוגדרים
- ✅ בדוק שה-`package.json` תקין

## קבצים שנוצרו/עודכנו

### קבצים חדשים:
- `backend/Procfile`
- `backend/render.yaml`
- `backend/railway.json`
- `backend/.env.example`
- `backend/.gitignore`
- `backend/README.md`
- `src/config/api.js`
- `extension/config.js`
- `DEPLOYMENT_GUIDE.md` (קובץ זה)

### קבצים שעודכנו:
- `src/content-scripts/content.ts`
- `src/popup/PopupComponent.vue`
- `src/options/OptionsComponent.vue`
- `src/manifest.json`
- `extension/popup.html`
- `extension/options.html`
- `extension/manifest.json`

---

**בהצלחה עם ההעלאה! 🚀**

אם יש בעיות, בדוק את ה-logs של Render/Railway או פנה לתמיכה.
