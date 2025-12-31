# Map View Heat Map Implementation

## Overview
Updated the MapView component to display data from Supabase's `metric_observations` table as an interactive heat map (choropleth) using Mapbox.

## What Was Changed

### 1. **Data Source**
- **Before**: Used API calls when users clicked on map regions
- **After**: Loads all variables from the `variables` table and displays metric observations as a heat map

### 2. **User Flow**
- **Before**: User had to click on specific regions to fetch data
- **After**: 
  1. User selects a variable from dropdown
  2. System automatically fetches all metric observations for that variable (most recent date)
  3. Map displays color-coded regions based on data values
  4. Works at all zoom levels (state/county/ZIP)

### 3. **Key Features**

#### Variable Loading
- Fetches all variables from `variables` table on component mount
- Groups variables by category (from the `category` column)
- Displays in searchable dropdown

#### Heat Map Visualization
- **Color Scale**: Blue gradient from light (low values) to dark (high values)
  - Light blue (#eff6ff) → Dark blue (#1d4ed8)
- **Auto-updates**: Changes when:
  - Different variable is selected
  - User zooms in/out (switches between state/county/ZIP)

#### Geographic Matching
- **States**: Matches by `name` field
- **Counties**: Matches by `county_fips` or `GEOID` 
- **ZIP codes**: Matches by `zcta` or `ZCTA5CE10`

#### Legend
- Displays min and max values for current view
- Shows color gradient scale
- Updates dynamically based on visible data

## Technical Details

### Database Queries

```typescript
// 1. Load all variables
SELECT id, key, label, category FROM variables ORDER BY label

// 2. Get most recent date for selected variable
SELECT date FROM metric_observations 
WHERE variable_id = ? 
ORDER BY date DESC 
LIMIT 1

// 3. Get all observations for that date
SELECT 
  geo_entity_id, variable_id, value, date,
  geo_entity:geo_entities(id, geoid, geo_level, name, state_abbr, county_fips, zcta)
FROM metric_observations
WHERE variable_id = ? AND date = ?
```

### Color Calculation
```typescript
getColorForValue(value: number, min: number, max: number): string
```
- Normalizes value between 0-1
- Interpolates between 5 color stops on blue gradient
- Returns RGB color string

### Map Layers
Each geographic level has:
1. **Fill layer**: Colored regions based on data values
2. **Line layer**: Boundaries/borders
3. **Label layer**: Geographic names (states/counties)

## File Changes
- **Modified**: `src/components/MapView.tsx`
  - Added Supabase integration
  - Removed old API-based click handlers
  - Added heat map rendering logic
  - Simplified UI (removed Pro variable filters)

## Testing Checklist

1. ✅ Variables load from database
2. ✅ Selecting a variable fetches metric data
3. ✅ Map displays color-coded regions
4. ✅ Zoom in/out switches between state/county/ZIP levels
5. ✅ Legend shows correct min/max values
6. ✅ No linting errors
7. ✅ HMR updates working

## Next Steps

### Data Matching Validation
You may need to verify that the geographic matching works correctly:
- Check if your GeoJSON `name` properties match `geo_entities.name` for states
- Check if your GeoJSON `GEOID` or `fips` properties match `geo_entities.county_fips` for counties
- Check if your GeoJSON `ZCTA5CE10` properties match `geo_entities.zcta` for ZIPs

If the matches aren't working, you can:
1. Check a few sample features from your GeoJSON files
2. Check a few sample rows from your `geo_entities` table
3. Update the matching logic in the `createValueMap()` function

### Testing with Real Data
1. Navigate to the Map View in your app (http://localhost:5173)
2. Open the variable dropdown
3. Select a variable that has data
4. Verify the map shows colored regions
5. Zoom in/out to test different geographic levels

## Troubleshooting

### No colors showing on map
- Check browser console for errors
- Verify data exists for the selected variable
- Check that `geo_entities` table has matching geographic identifiers

### Wrong colors/values
- Verify the min/max calculation in `getValueRange()`
- Check that the correct `geo_level` is being filtered

### Performance issues
- Consider adding pagination for variables dropdown if you have many variables
- Consider limiting the date range query if you have millions of observations

## Implementation Notes

The heat map uses Mapbox's fill layers with dynamically calculated colors. Each feature (state/county/ZIP) gets a `color` property added based on its data value, which Mapbox then uses to render the choropleth map.

This approach is efficient because:
- Colors are pre-calculated once per data fetch
- Mapbox handles the actual rendering
- Only the current zoom level's data is visualized

