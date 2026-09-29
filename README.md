# 🎬 Netflix Customer Churn Prediction Model & Power BI Analytics Dashboard

> **End-to-End Machine Learning Pipeline, Feature Engineering, Multi-Model Benchmarking, Power BI Integration, and Interactive Dark-Mode Web Dashboard.**

---

## 📌 Executive Summary

Customer churn is one of the most critical metrics for subscription-based streaming platforms like Netflix. Acquiring a new subscriber can cost **5x to 7x more** than retaining an existing one. 

This project delivers a complete **Data Science & Business Intelligence solution** built on a dataset of **5,000 Netflix customers**:
1. **Data Cleaning & Feature Engineering**: Transformed raw behavioral and transactional metrics into predictive features (`engagement_score`, `value_ratio`, `watch_time_per_profile`, `inactivity_high_flag`, `payment_high_risk_flag`).
2. **Machine Learning Pipeline**: Trained and benchmarked 5 classification algorithms using 5-Fold Stratified Cross Validation. The optimal model (**Gradient Boosting**) achieved **99.50% Accuracy** and **0.9998 ROC-AUC Score**.
3. **Risk Scoring & Driver Classification**: Evaluated churn probability (0–100%) for every customer, assigned risk tiers (`High Risk`, `Medium Risk`, `Low Risk`), identified primary risk drivers, and calculated total annual revenue exposure (**$404,240 at risk**).
4. **Power BI Analytics Setup**: Designed a star schema data model, complete DAX measures library, page-by-page visual specifications, and step-by-step publishing instructions (`powerbi_dashboard_guide.md`).
5. **Interactive Web Dashboard**: Built a responsive, publication-ready web application (`index.html`, `styles.css`, `app.js`) with live filtering, Chart.js visualizations, KPI card updates, and a customer risk search desk.

---

## 📁 Repository File Structure

```
├── netflix_customer_churn.csv                # Raw dataset (5,000 rows, 14 columns)
├── train_churn_model.py                      # Python ML pipeline script (Preprocessing, CV, Training, Exports)
├── churn_model.pkl                           # Serialized optimal ML pipeline & preprocessor
│
├── processed_netflix_churn_with_predictions.csv  # Enriched dataset with predictions, probabilities & risk drivers
├── processed_netflix_churn_with_predictions.xlsx # Excel version of enriched predictions dataset
├── churn_model_metrics.csv                   # Benchmark evaluation metrics across 5 ML algorithms
├── feature_importance.csv                    # Ranked feature importances and percentage weights
├── churn_kpi_summary.csv                     # Regional & plan tier aggregated summary for Power BI
│
├── powerbi_dashboard_guide.md                # Power BI Star Schema, DAX library, theme & visual layout guide
├── index.html                                # Interactive Power BI dark-mode web dashboard HTML
├── styles.css                                # Modern dark-mode dashboard stylesheet (Outfit font, Netflix Red)
├── app.js                                    # Interactive dashboard logic, Chart.js visuals & live filters
├── data.js                                   # Pre-compiled JSON data layer for web dashboard rendering
└── README.md                                 # Complete project documentation
```

---

## 🛠️ Data Architecture & Feature Engineering

### Raw Features Summary (`netflix_customer_churn.csv`):
- `customer_id`: Unique subscriber UUID.
- `age`: Subscriber age (18 to 70 years).
- `gender`: Gender identity (`Female`, `Male`, `Other`).
- `subscription_type`: Plan tier (`Basic`: $8.99, `Standard`: $13.99, `Premium`: $17.99).
- `watch_hours`: Total watch hours logged on the platform.
- `last_login_days`: Days elapsed since the last platform login.
- `region`: Geographic location (`Africa`, `Asia`, `Europe`, `North America`, `Oceania`, `South America`).
- `device`: Primary viewing device (`Desktop`, `Laptop`, `Mobile`, `Tablet`, `TV`).
- `monthly_fee`: Monthly plan charge ($8.99, $13.99, $17.99).
- `payment_method`: Billing method (`Credit Card`, `Crypto`, `Debit Card`, `Gift Card`, `PayPal`).
- `number_of_profiles`: Household profiles configured (1 to 5).
- `avg_watch_time_per_day`: Average daily viewing hours.
- `favorite_genre`: Most watched content genre (`Action`, `Comedy`, `Documentary`, `Drama`, `Horror`, `Romance`, `Sci-Fi`).
- `churned`: Ground truth target variable (`1` = Churned, `0` = Retained).

### Engineered Features:
1. `engagement_score`: `watch_hours / (last_login_days + 1.0)` — Core metric quantifying activity relative to inactivity duration.
2. `value_ratio`: `watch_hours / monthly_fee` — Perceived financial value per dollar spent.
3. `watch_time_per_profile`: `avg_watch_time_per_day / number_of_profiles` — Individual viewing intensity per profile.
4. `inactivity_high_flag`: Binary indicator (`1` if `last_login_days >= 30` else `0`).
5. `single_profile_flag`: Binary indicator (`1` if `number_of_profiles == 1` else `0`).
6. `payment_high_risk_flag`: Binary indicator (`1` if `payment_method` in `['Crypto', 'Gift Card']` else `0`).
7. `low_watch_flag`: Binary indicator (`1` if `watch_hours < 10.0` else `0`).
8. `annual_revenue`: `monthly_fee * 12.0` — Annualized customer revenue.

---

## 🏆 Machine Learning Model Evaluation & Results

Five classification models were evaluated using 5-Fold Stratified Cross-Validation:

| Model Algorithm | Accuracy | Precision | Recall | F1-Score | ROC-AUC Score | Log Loss | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 🏆 **Gradient Boosting** | **99.50%** | **99.80%** | **99.20%** | **99.50%** | **0.9998** | **0.0260** | **Optimal Model** |
| ⚡ **XGBoost** | 99.70% | 100.00% | 99.40% | 99.70% | 0.9997 | 0.0194 | Benchmarked |
| 💡 **LightGBM** | 99.30% | 99.40% | 99.20% | 99.30% | 0.9996 | 0.0180 | Benchmarked |
| 🌲 **Random Forest** | 98.10% | 98.21% | 98.01% | 98.11% | 0.9980 | 0.1007 | Benchmarked |
| 📈 **Logistic Regression** | 90.50% | 89.69% | 91.65% | 90.66% | 0.9744 | 0.2075 | Baseline |

### Feature Importance Weights (Top 7 Drivers):
1. **`engagement_score` (58.53%)**: Dominant factor explaining customer churn.
2. **`watch_hours` (9.65%)**: Total viewing volume.
3. **`number_of_profiles` (7.75%)**: Multi-profile households show higher retention.
4. **`last_login_days` (7.37%)**: Platform login recency.
5. **`payment_high_risk_flag` (7.04%)**: Non-recurring billing channels show high volatility.
6. **`subscription_type_Basic` (3.59%)**: Basic plan tier vulnerability.
7. **`monthly_fee` (2.95%)**: Pricing sensitivity.

---

## 📊 Power BI Setup & DAX Measures

The project includes a complete guide ([powerbi_dashboard_guide.md](file:///d:/New%20folder/powerbi_dashboard_guide.md)) for building an executive dashboard in Power BI Desktop.

### Core DAX Measures Sample:

```dax
Total Customers = COUNTROWS('processed_netflix_churn_with_predictions')

Actual Churn Rate % = 
DIVIDE(
    SUM('processed_netflix_churn_with_predictions'[churned]), 
    [Total Customers], 
    0
)

Predicted Churn Rate % = 
DIVIDE(
    SUM('processed_netflix_churn_with_predictions'[predicted_churn_flag]), 
    [Total Customers], 
    0
)

High Risk Customers = 
CALCULATE(
    [Total Customers],
    'processed_netflix_churn_with_predictions'[churn_risk_segment] = "High Risk"
)

Annual Revenue at Risk = 
SUM('processed_netflix_churn_with_predictions'[annual_revenue_at_risk])

Best Model ROC AUC = 
CALCULATE(
    MAX('churn_model_metrics'[ROC_AUC]),
    'churn_model_metrics'[Model] = "Gradient Boosting"
)
```

---

## 💻 How to Run & Use the Project

### 1. Prerequisites & Environment Setup
Ensure Python 3.9+ is installed along with required packages:
```bash
pip install pandas numpy scikit-learn xgboost lightgbm openpyxl joblib matplotlib seaborn
```

### 2. Re-run Machine Learning Pipeline & Data Exports
To retrain models and regenerate prediction datasets:
```bash
python train_churn_model.py
```
This updates `processed_netflix_churn_with_predictions.csv`, `processed_netflix_churn_with_predictions.xlsx`, `churn_model_metrics.csv`, `feature_importance.csv`, `churn_kpi_summary.csv`, and `churn_model.pkl`.

### 3. Re-generate Web Dashboard Data Layer
To refresh the dataset embedded in the web dashboard:
```bash
python -c "
import pandas as pd, json
df = pd.read_csv('processed_netflix_churn_with_predictions.csv')
metrics = pd.read_csv('churn_model_metrics.csv')
feat = pd.read_csv('feature_importance.csv')
data = {'customers': df.to_dict(orient='records'), 'metrics': metrics.to_dict(orient='records'), 'feature_importance': feat.head(10).to_dict(orient='records')}
with open('data.js', 'w', encoding='utf-8') as f:
    f.write('const CHURN_DATA = ' + json.dumps(data, indent=2) + ';')
print('data.js updated!')
"
```

### 4. Run Interactive Web Dashboard
Launch a local web server:
```bash
python -m http.server 8000
```
Then open **[http://localhost:8000](http://localhost:8000)** in your browser, or double-click `index.html`.

---

## 💡 Strategic Business Recommendations

1. **Automate Inactivity Triggers (<14 Days)**:
   - Inactivity duration (`last_login_days >= 30`) accounts for **2,555 high-risk customers**.
   - *Recommendation*: Deploy automated push notifications and email digests featuring personalized genre recommendations after 14 consecutive inactive days.
2. **Incentivize Auto-Pay Conversion**:
   - Crypto (59.7% churn) and Gift Card (57.8% churn) users experience twice the churn rate of Credit/Debit card users (43.6%).
   - *Recommendation*: Offer a 10% monthly discount or bonus viewing perks for switching to recurring Credit Card or Debit Card billing.
3. **Upgrade Single Profile & Basic Plan Subscribers**:
   - Single-profile Basic Plan accounts churn at **61.8%** due to lower account stickiness.
   - *Recommendation*: Introduce a discounted "Add a Profile" promo or a 30-day free trial of the Standard Plan to increase household engagement.
