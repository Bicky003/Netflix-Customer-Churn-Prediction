import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, log_loss, confusion_matrix
)
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
import xgboost as xgb
import lightgbm as lgb

def load_and_preprocess_data(csv_path):
    print(f"[*] Loading dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # Clean dataset
    df.columns = [col.strip() for col in df.columns]
    
    # Feature Engineering
    print("[*] Performing Feature Engineering...")
    df['engagement_score'] = df['watch_hours'] / (df['last_login_days'] + 1.0)
    df['value_ratio'] = df['watch_hours'] / (df['monthly_fee'] + 0.01)
    df['watch_time_per_profile'] = df['avg_watch_time_per_day'] / (df['number_of_profiles'] + 0.001)
    df['inactivity_high_flag'] = (df['last_login_days'] >= 30).astype(int)
    df['single_profile_flag'] = (df['number_of_profiles'] == 1).astype(int)
    df['payment_high_risk_flag'] = df['payment_method'].isin(['Crypto', 'Gift Card']).astype(int)
    df['low_watch_flag'] = (df['watch_hours'] < 10.0).astype(int)
    df['annual_revenue'] = df['monthly_fee'] * 12.0
    
    return df

def get_preprocessor(categorical_cols, numerical_cols):
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols)
        ]
    )
    return preprocessor

def main():
    dataset_path = 'netflix_customer_churn.csv'
    if not os.path.exists(dataset_path):
        print(f"Error: {dataset_path} not found.")
        return
        
    df = load_and_preprocess_data(dataset_path)
    
    # Define features
    feature_cols = [
        'age', 'gender', 'subscription_type', 'watch_hours', 'last_login_days',
        'region', 'device', 'monthly_fee', 'payment_method', 'number_of_profiles',
        'avg_watch_time_per_day', 'favorite_genre', 'engagement_score',
        'value_ratio', 'watch_time_per_profile', 'inactivity_high_flag',
        'single_profile_flag', 'payment_high_risk_flag', 'low_watch_flag'
    ]
    
    categorical_cols = ['gender', 'subscription_type', 'region', 'device', 'payment_method', 'favorite_genre']
    numerical_cols = [c for c in feature_cols if c not in categorical_cols]
    
    X = df[feature_cols]
    y = df['churned']
    
    # Train test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    print(f"[*] Train set shape: {X_train.shape}, Test set shape: {X_test.shape}")
    
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, C=1.0, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=150, learning_rate=0.05, max_depth=5, random_state=42),
        'XGBoost': xgb.XGBClassifier(n_estimators=200, max_depth=5, learning_rate=0.05, eval_metric='logloss', random_state=42),
        'LightGBM': lgb.LGBMClassifier(n_estimators=200, max_depth=5, learning_rate=0.05, random_state=42, verbosity=-1)
    }
    
    metrics_summary = []
    trained_pipelines = {}
    
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    print("\n" + "="*60)
    print(" MODEL EVALUATION AND CV BENCHMARKING ")
    print("="*60)
    
    best_name = None
    best_auc = -1.0
    
    for name, model in models.items():
        preprocessor = get_preprocessor(categorical_cols, numerical_cols)
        pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('classifier', model)
        ])
        
        # Fit on train set
        pipeline.fit(X_train, y_train)
        
        # Predict on test set
        y_pred = pipeline.predict(X_test)
        y_proba = pipeline.predict_proba(X_test)[:, 1]
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_proba)
        loss = log_loss(y_test, y_proba)
        
        metrics_summary.append({
            'Model': name,
            'Accuracy': round(acc, 4),
            'Precision': round(prec, 4),
            'Recall': round(rec, 4),
            'F1_Score': round(f1, 4),
            'ROC_AUC': round(auc, 4),
            'Log_Loss': round(loss, 4)
        })
        
        trained_pipelines[name] = pipeline
        print(f"{name:20s} | Acc: {acc:.4f} | Prec: {prec:.4f} | Rec: {rec:.4f} | F1: {f1:.4f} | AUC: {auc:.4f}")
        
        if auc > best_auc:
            best_auc = auc
            best_name = name
            
    metrics_df = pd.DataFrame(metrics_summary).sort_values(by='ROC_AUC', ascending=False)
    print("\n[*] Model Metrics Ranking:")
    print(metrics_df.to_string(index=False))
    metrics_df.to_csv('churn_model_metrics.csv', index=False)
    print("[+] Saved model comparison to 'churn_model_metrics.csv'")
    
    # Save best model pipeline
    best_pipeline = trained_pipelines[best_name]
    print(f"\n[*] Best Model selected: {best_name} (ROC-AUC: {best_auc:.4f})")
    
    # Fit best model on entire dataset for full dataset predictions
    best_pipeline.fit(X, y)
    joblib.dump({
        'pipeline': best_pipeline,
        'feature_cols': feature_cols,
        'categorical_cols': categorical_cols,
        'numerical_cols': numerical_cols,
        'model_name': best_name,
        'metrics': metrics_df.to_dict(orient='records')
    }, 'churn_model.pkl')
    print("[+] Saved model pipeline artifact to 'churn_model.pkl'")
    
    # Feature Importance Extraction
    print("\n[*] Extracting Feature Importances...")
    classifier = best_pipeline.named_steps['classifier']
    preprocessor = best_pipeline.named_steps['preprocessor']
    
    # Get feature names after one hot encoding
    cat_encoder = preprocessor.named_transformers_['cat']
    encoded_cat_names = cat_encoder.get_feature_names_out(categorical_cols)
    all_transformed_feature_names = list(numerical_cols) + list(encoded_cat_names)
    
    if hasattr(classifier, 'feature_importances_'):
        importances = classifier.feature_importances_
    elif hasattr(classifier, 'coef_'):
        importances = np.abs(classifier.coef_[0])
    else:
        importances = np.zeros(len(all_transformed_feature_names))
        
    feat_imp_df = pd.DataFrame({
        'Feature': all_transformed_feature_names,
        'Importance': importances
    }).sort_values(by='Importance', ascending=False)
    
    feat_imp_df['Importance_Pct'] = (feat_imp_df['Importance'] / feat_imp_df['Importance'].sum()) * 100
    feat_imp_df.to_csv('feature_importance.csv', index=False)
    print(f"[+] Saved feature importances to 'feature_importance.csv'")
    print(feat_imp_df.head(10).to_string(index=False))
    
    # Generate Enriched Predictions on Full Dataset
    df_enriched = df.copy()
    full_proba = best_pipeline.predict_proba(X)[:, 1]
    full_pred = (full_proba >= 0.50).astype(int)
    
    df_enriched['predicted_churn_flag'] = full_pred
    df_enriched['churn_probability'] = np.round(full_proba, 4)
    df_enriched['churn_probability_pct'] = np.round(full_proba * 100, 2)
    
    # Assign Risk Categories
    conditions = [
        (df_enriched['churn_probability'] >= 0.65),
        (df_enriched['churn_probability'] >= 0.35) & (df_enriched['churn_probability'] < 0.65),
        (df_enriched['churn_probability'] < 0.35)
    ]
    choices = ['High Risk', 'Medium Risk', 'Low Risk']
    df_enriched['churn_risk_segment'] = np.select(conditions, choices, default='Medium Risk')
    
    # Primary Risk Driver Logic
    def get_risk_driver(row):
        if row['last_login_days'] >= 30:
            return "High Inactivity (30+ Days)"
        elif row['watch_hours'] < 10.0:
            return "Low Watch Volume (<10 Hrs)"
        elif row['payment_method'] in ['Crypto', 'Gift Card']:
            return "High-Risk Payment Channel"
        elif row['subscription_type'] == 'Basic' and row['avg_watch_time_per_day'] < 0.5:
            return "Basic Plan Low Engagement"
        elif row['number_of_profiles'] == 1 and row['avg_watch_time_per_day'] < 0.8:
            return "Single Profile Low Usage"
        else:
            return "General Activity Decline"
            
    df_enriched['primary_risk_driver'] = df_enriched.apply(get_risk_driver, axis=1)
    
    # Revenue at Risk
    df_enriched['monthly_revenue_at_risk'] = np.where(
        df_enriched['predicted_churn_flag'] == 1, df_enriched['monthly_fee'], 0.0
    )
    df_enriched['annual_revenue_at_risk'] = np.where(
        df_enriched['predicted_churn_flag'] == 1, df_enriched['annual_revenue'], 0.0
    )
    
    # Export Enriched Datasets
    csv_out = 'processed_netflix_churn_with_predictions.csv'
    xlsx_out = 'processed_netflix_churn_with_predictions.xlsx'
    
    df_enriched.to_csv(csv_out, index=False)
    df_enriched.to_excel(xlsx_out, index=False, engine='openpyxl')
    print(f"\n[+] Exported full dataset with predictions to '{csv_out}' & '{xlsx_out}'")
    
    # Build KPI Aggregation Summary File for Power BI
    kpi_summary = df_enriched.groupby(['region', 'subscription_type', 'churn_risk_segment']).agg(
        total_customers=('customer_id', 'count'),
        actual_churned_count=('churned', 'sum'),
        actual_churn_rate=('churned', 'mean'),
        predicted_churned_count=('predicted_churn_flag', 'sum'),
        avg_churn_probability=('churn_probability', 'mean'),
        total_monthly_revenue=('monthly_fee', 'sum'),
        monthly_revenue_at_risk=('monthly_revenue_at_risk', 'sum'),
        annual_revenue_at_risk=('annual_revenue_at_risk', 'sum'),
        avg_watch_hours=('watch_hours', 'mean'),
        avg_last_login_days=('last_login_days', 'mean')
    ).reset_index()
    
    kpi_summary.to_csv('churn_kpi_summary.csv', index=False)
    print("[+] Exported Power BI KPI summary table to 'churn_kpi_summary.csv'")
    print("\n[*] SUCCESS: Churn prediction ML pipeline complete!")

if __name__ == '__main__':
    main()
