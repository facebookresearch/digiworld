import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native'
import { Text } from './Text'
import { colors, spacing, useAppTheme } from '@andojo/shared-theme'
import DateTimePicker from '@react-native-community/datetimepicker'
import { DataFilter } from '@/models/EmailModel'
import { Ionicons } from '@expo/vector-icons'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { useStores } from '@/models'
import { CategoriesView } from './CategoriesView'
import { createCommonStyles } from './commonStyles'
import { observer } from 'mobx-react-lite'

interface DateFilterProps {
  visible: boolean
  onClose: () => void
  onConfirm: (data?: DataFilter) => void
  currentFilter?: DataFilter
}

type DatePickerType = 'from' | 'to'

export const DateFilter = observer(function DateFilter({
  visible,
  onClose,
  onConfirm,
  currentFilter,
}: DateFilterProps) {
  const { theme } = useAppTheme()
  const commonStyles = React.useMemo(() => createCommonStyles(theme), [theme])
  const { uiStore } = useStores()

  const scaleAnim = useRef(new Animated.Value(0)).current
  const [datePicker, setDatePicker] = useState<DatePickerType>()

  // Get state from store (reactive - observer will re-render when these change)
  const selectedFilter = uiStore.filterSelectedTab
  const errorMsg = uiStore.filterErrorMsg

  // Read directly from store.filterState for reactivity (observer tracks property access)
  // Convert ISO strings to Date objects inline
  const rawFilterState = uiStore.filterState
  const storeFilterState: DataFilter | undefined = rawFilterState
    ? {
        date: rawFilterState.date
          ? {
              from: rawFilterState.date.from
                ? new Date(rawFilterState.date.from)
                : null,
              to: rawFilterState.date.to
                ? new Date(rawFilterState.date.to)
                : null,
            }
          : undefined,
        categories: rawFilterState.categories,
      }
    : undefined

  // Use currentFilter prop if provided (for initial sync), otherwise use store
  const filterState = currentFilter || storeFilterState
  const selDate = filterState?.date || { from: null, to: null }
  const selCategories = filterState?.categories || []

  const { trackContentChange } = useInteractionTracking(
    'inbox',
    '/(tabs)/inbox',
  )

  // Sync state with parent's currentFilter prop when it changes
  useEffect(() => {
    // State is already synced via currentFilter prop, no local state needed
  }, [currentFilter])

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start()
    } else {
      scaleAnim.setValue(0)
    }
  }, [visible, scaleAnim])

  if (!visible) return null

  const handleDateChange = (
    event: any,
    selectedDate: Date | undefined,
    type: DatePickerType,
  ) => {
    setDatePicker(undefined)
    if (event.type === 'set' && selectedDate) {
      // User selected a date and confirmed
      if (
        (type === 'from' &&
          selDate.to &&
          selectedDate.getTime() > selDate.to.getTime()) ||
        (type === 'to' &&
          selDate.from &&
          selDate.from.getTime() > selectedDate.getTime())
      ) {
        const msg = `Please select correct ${type} date`
        trackContentChange({
          errorMsg: msg,
        })
        uiStore.setFilterErrorMsg(msg)
        return
      }

      const newDate = {
        ...selDate,
        [type]: selectedDate,
      }
      trackContentChange({
        errorMsg: '',
        selDate: {
          ...newDate,
        },
      })
      uiStore.setFilterErrorMsg('')
      // Update filter state immediately for preview
      onConfirm({
        date: newDate,
        categories: selCategories,
      })
    }
  }

  const filterDate = (filter: DatePickerType) => {
    setDatePicker(filter)
  }

  const clearSelFilter = () => {
    uiStore.clearFilterState()
    onConfirm(undefined)
    trackContentChange({
      selDate: {
        from: null,
        to: null,
      },
      selectedFilter: 'date',
      selCategories: [],
    })
    onClose()
  }

  const setSelection = (item: string) => {
    const vals = [...selCategories]
    const index = vals.indexOf(item)

    if (index === -1) {
      vals.push(item)
    } else {
      vals.splice(index, 1)
    }

    trackContentChange({
      selCategories: [...vals],
    })
    // Update filter state immediately for preview
    onConfirm({
      date: selDate,
      categories: vals,
    })
  }

  const showFilter = (filter: string) => {
    trackContentChange({
      selectedFilter: filter,
    })
    uiStore.setFilterSelectedTab(filter)
  }

  const dateFilterView = (
    <>
      <View style={styles.filterDates}>
        <View style={styles.duration}>
          <Text text="From Date" preset="formLabel" />
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => filterDate('from')}
          >
            <Text
              preset="default"
              style={styles.dateButtonText}
              text={selDate.from?.toDateString() || 'Select Date'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.duration}>
          <Text text="To Date" preset="formLabel" />
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => filterDate('to')}
          >
            <Text
              preset="default"
              style={styles.dateButtonText}
              text={selDate.to?.toDateString() || 'Select Date'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {errorMsg && (
        <View style={styles.helperError}>
          <Text text={errorMsg} preset="formLabel" style={styles.errorText} />
        </View>
      )}
    </>
  )

  const categoriesView = (
    <CategoriesView
      selectedCategories={selCategories}
      setSelection={setSelection}
    />
  )

  const getSelectedFilter = () => {
    switch (selectedFilter) {
      case 'category':
        return categoriesView
      default:
        return dateFilterView
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={clearSelFilter}
    >
      <View style={styles.overlay}>
        {datePicker && (
          <DateTimePicker
            maximumDate={new Date()}
            value={selDate[datePicker] || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) =>
              handleDateChange(event, selectedDate, datePicker)
            }
          />
        )}
        <Animated.View
          style={[
            commonStyles.dialog,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <View>
              <Ionicons
                name="close"
                size={24}
                color={colors.palette.primary500}
                onPress={clearSelFilter}
              />
            </View>
          </View>
          <Text text="Apply Filters" preset="subheading" />

          <View style={styles.filterView}>
            <View style={styles.leftPanel}>
              <TouchableOpacity
                style={[
                  styles.category,
                  selectedFilter === 'date' && styles.selectedCategory,
                ]}
                onPress={() => showFilter('date')}
              >
                <Text text="Dates" preset="formLabel" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.category,
                  selectedFilter === 'category' && styles.selectedCategory,
                ]}
                onPress={() => showFilter('category')}
              >
                <Text text="Categories" preset="formLabel" />
              </TouchableOpacity>
            </View>
            <View style={styles.rightPanel}>{getSelectedFilter()}</View>
          </View>

          <View style={commonStyles.buttonContainer}>
            <TouchableOpacity
              style={[commonStyles.button, commonStyles.cancelButton]}
              onPress={() => {
                clearSelFilter()
              }}
            >
              <Text text="Clear" style={commonStyles.buttonText} />
            </TouchableOpacity>
            {onConfirm && (
              <TouchableOpacity
                style={[commonStyles.button, commonStyles.confirmButton]}
                onPress={() => {
                  onConfirm({
                    date: selDate,
                    categories: selCategories,
                  })
                  onClose()
                }}
              >
                <Text
                  text="Apply"
                  style={[
                    commonStyles.buttonText,
                    commonStyles.confirmButtonText,
                  ]}
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
})

const styles = StyleSheet.create({
  iconContainer: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: colors.palette.overlay50,
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  filterDates: {
    display: 'flex',
    flexDirection: 'row',
    columnGap: 10,
    marginTop: 10,
  },
  duration: {
    flex: 1,
  },
  dateButton: {
    backgroundColor: colors.palette.neutral200,
    borderRadius: 8,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  dateButtonText: {
    color: colors.text,
    fontSize: 14,
  },
  helperError: {
    marginTop: 10,
  },
  errorText: {
    color: colors.error,
  },
  filterView: {
    display: 'flex',
    flexDirection: 'row',
    columnGap: 10,
    marginTop: 20,
    height: '85%',
  },
  leftPanel: {
    width: '30%',
  },
  rightPanel: {
    width: '70%',
  },
  category: {
    padding: 5,
  },
  selectedCategory: {
    backgroundColor: colors.palette.accent500,
  },
})
