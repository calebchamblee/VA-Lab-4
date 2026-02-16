from flask import Flask, render_template, request, jsonify
import pandas as pd

# init app
app = Flask(__name__)

# read data and set defaults
orders = pd.read_excel('./Sample - Superstore.xls')
app.filtered_orders = orders
app.filters = {}
app.grouper = "Country/Region"
app.value = "Quantity"
app.agg = "sum"

groups = ['Country/Region', 'Region', 'State/Province']
values = ['Quantity', 'Sales', 'Profit']
aggs = ['sum', 'mean', 'variance', 'count']

# possible filters are all possible values for each category
def get_group_filters(df=None):
    if df is None:
        df = orders
    # filter dropdown options are derived from the current filtered dataset
    # to prevent inconsistent selections (reset via the most-specific filter)
    return {
        'Country/Region': df['Country/Region'].unique().tolist(),
        'Region': df['Region'].unique().tolist(),
        'State/Province': df['State/Province'].unique().tolist()
    }

# get the new df based on filters/aggregation
def get_aggregated_data():
    x_col = app.grouper
    y_col = app.value

    # translate so pandas understands
    aggGrouper = app.agg
    if (app.agg == "variance"):
        aggGrouper = "var"
    res_df = app.filtered_orders.groupby(x_col)[y_col].agg(aggGrouper).reset_index()

    # add back categories that were lost so they stay in the chart
    all_categories = orders[x_col].unique().tolist()
    existing_categories = res_df[x_col].tolist()

    for cat in all_categories:
        if cat not in existing_categories:
            res_df.loc[len(res_df)] = [cat, 0]   
    
    return res_df.to_dict('list')

# pass the groups, values, aggregate functions, and group filters to the root.html template
@app.route("/")
def root():
    return render_template(
        "root.html",
        groups=groups,
        values=values,
        aggs=aggs,
        group_filters=get_group_filters()
    )

# payload has format: {key: key, value: value}
@app.route("/update_aggregate", methods=["POST"])
def update_aggregate():
    payload = request.json
    if payload['key'] == 'agg':
        app.agg = payload['value']
    elif payload['key'] == 'grouper':
        app.grouper = payload['value']
    elif payload['key'] == 'value':
        app.value = payload['value']

    # reset filters and get the latest aggregated data
    app.filters = {}
    app.filtered_orders = orders.copy()

    res_dict = get_aggregated_data()
    return jsonify({'y_column': res_dict[app.value], 
                    'x_column': res_dict[app.grouper],
                    'group_filters': get_group_filters()
                    })

# update the df upon filtering
@app.route("/update_filter", methods=["POST"])
def update_filter():
    # update the global filter state (app.filters)
    payload = request.json
    filter_key = payload['key']
    filter_value = payload['value']
    if filter_value == 'All':
        if filter_key in app.filters:
            del app.filters[filter_key]
    else:
        app.filters[filter_key] = [filter_value]

    # update app.filtered_orders based on the latest filters
    filter_mask = pd.Series([True] * len(orders))
    # app.filter looks something like: { 'Country/Region': [All]... }
    for col, allowed_val in app.filters.items():
        # pandas series of rows that fit filter most recent filter
        mask = orders[col].isin(allowed_val)
        # now update to account for all filters up until current
        filter_mask = filter_mask & mask
    
    # use the filters to subset the dataframe
    app.filtered_orders = orders[filter_mask]

    # change what filter options are available given current filters
    new_filters = get_group_filters(app.filtered_orders)
    new_data = get_aggregated_data()
    x_values = new_data[app.grouper]
    y_values = new_data[app.value]
    return jsonify({
            'group_filters': new_filters, 
            'x_column': x_values, 
            'y_column': y_values 
           })

# run when called from app
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000)
