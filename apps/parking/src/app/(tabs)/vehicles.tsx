// Copyright (c) Meta Platforms, Inc. and affiliates.
import React, { useCallback, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { Text, useAppTheme, type Theme } from '@andojo/shared-theme'
import { useFocusEffect, useRouter } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models/helpers/useStores'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'
import { FancyAlert, SuccessDialog } from '@/components'
import { debounce } from 'lodash'

const VehiclesScreen = observer(() => {
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { parkingStore } = useStores()
  const router = useRouter()
  const { trackScreenMount } = useInteractionTracking('vehicles', '/vehicles')

  useFocusEffect(
    useCallback(() => {
      trackScreenMount({
        timestamp: Date.now(),
        screen: 'vehicles',
        route: '/vehicles',
      })
      // Load notifications when home screen is focused
      return () => {
        // Home screen unfocused
      }
    }, [trackScreenMount]),
  )

  const vehicles = parkingStore.vehicles
  const vehicleTypes = parkingStore.vehicleTypes

  const getVehicleTypeName = (vehicleTypeId: number) => {
    const vehicleType = vehicleTypes.find((vt: any) => vt.id === vehicleTypeId)
    return vehicleType?.name || 'Unknown'
  }

  // Debounced navigation to prevent multiple rapid taps
  const handleAddVehicle = useCallback(
    debounce(() => {
      parkingStore.resetVehicleForm()
      parkingStore.hideDialog() // Clear any existing dialog state
      router.push('/screens/vehicles/add' as any)
    }, 300),
    [router, parkingStore],
  )

  const handleDeleteVehicle = useCallback(
    debounce((vehicleId: number) => {
      parkingStore.showDeleteVehicleConfirm(vehicleId)
    }, 300),
    [parkingStore],
  )

  const confirmDelete = async () => {
    const vehicleId = parkingStore.vehicleManagementUI.vehicleToDelete
    if (!vehicleId) return

    try {
      await parkingStore.deleteVehicleWithValidation(vehicleId)
      parkingStore.showDialog({
        isSuccess: true,
        message: 'Vehicle Deleted',
        subMessage: 'The vehicle has been removed successfully',
      })
    } catch (error: any) {
      parkingStore.hideDeleteVehicleConfirm()

      // Get vehicle details for better error message
      const vehicle = parkingStore.vehicles.find((v: any) => v.id === vehicleId)
      const plateNumber = vehicle?.plateNumber || 'this vehicle'

      // Check the error message to show appropriate alert
      const errorMessage = error?.message || ''
      if (errorMessage.includes('active parking session')) {
        parkingStore.showAlert({
          title: 'Active Parking Session',
          message: `Cannot delete ${plateNumber} because it has an active parking session. Please end the parking session first before deleting this vehicle.`,
          preset: 'warning',
        })
      } else {
        // Show generic error for other issues
        parkingStore.showAlert({
          title: 'Delete Failed',
          message:
            errorMessage ||
            `Failed to delete ${plateNumber}. Please try again.`,
          preset: 'error',
        })
      }
    }
  }

  const renderVehicleItem = ({ item }: any) => {
    const vehicleTypeName = getVehicleTypeName(item.vehicleTypeId)
    const makeModel =
      item.make && item.model
        ? `${item.make} ${item.model}`
        : item.make || item.model || 'Vehicle'
    const nickname = item.nickname?.trim()

    return (
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleGradient}>
          <View style={styles.vehicleIconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="car"
                size={28}
                color={theme.colors.palette.primary500}
              />
            </View>
          </View>

          <View style={styles.vehicleContent}>
            <Text style={styles.plateNumber}>{item.plateNumber}</Text>

            <View style={styles.vehicleNameRow}>
              <Text style={styles.vehicleName}>{makeModel}</Text>
              {nickname ? (
                <Text style={styles.vehicleNickname}>({nickname})</Text>
              ) : null}
            </View>

            <View style={styles.vehicleDetails}>
              <View style={styles.detailBadge}>
                <Ionicons
                  name="pricetag"
                  size={12}
                  color={theme.colors.palette.primary500}
                />
                <Text style={styles.detailText}>{vehicleTypeName}</Text>
              </View>
              {item.color && (
                <View style={styles.detailBadge}>
                  <Ionicons
                    name="color-palette"
                    size={12}
                    color={theme.colors.palette.primary500}
                  />
                  <Text style={styles.detailText}>{item.color}</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteVehicle(item.id)}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={theme.colors.palette.angry500}
            />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary100,
            theme.colors.palette.primary200,
          ]}
          style={styles.emptyIconGradient}
        >
          <Ionicons
            name="car-outline"
            size={80}
            color={theme.colors.palette.primary500}
          />
        </LinearGradient>
      </View>
      <Text style={styles.emptyText}>No Vehicles Yet</Text>
      <Text style={styles.emptySubtext}>
        Add your first vehicle to start{'\n'}managing your parking sessions
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddVehicle}>
        <LinearGradient
          colors={[
            theme.colors.palette.primary500,
            theme.colors.palette.primary400,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyButtonGradient}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={theme.colors.palette.neutral100}
          />
          <Text style={styles.emptyButtonText}>Add Your First Vehicle</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          theme.colors.palette.neutral200,
          theme.colors.palette.neutral300,
          theme.colors.palette.neutral100,
        ]}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text preset="subheading" style={styles.headerTitle}>
              My Vehicles
            </Text>
            <Text style={styles.headerSubtitle}>
              Manage your registered vehicles
            </Text>
          </View>
        </View>

        {/* Vehicles List */}
        <FlatList
          data={vehicles}
          renderItem={renderVehicleItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      {/* Floating Action Button */}
      {vehicles.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddVehicle}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[
              theme.colors.palette.primary500,
              theme.colors.palette.primary400,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons
              name="add"
              size={28}
              color={theme.colors.palette.neutral100}
            />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Delete Confirmation Alert */}
      <FancyAlert
        visible={parkingStore.vehicleManagementUI.showDeleteConfirm}
        title="Delete Vehicle"
        message="Are you sure you want to delete this vehicle? This action cannot be undone."
        preset="delete"
        confirmText="Delete"
        cancelText="Cancel"
        onClose={() => parkingStore.hideDeleteVehicleConfirm()}
        onConfirm={confirmDelete}
      />

      {/* General Alert */}
      <FancyAlert
        visible={parkingStore.alertState.visible}
        title={parkingStore.alertState.title}
        message={parkingStore.alertState.message}
        preset={
          parkingStore.alertState.preset as
            | 'default'
            | 'success'
            | 'error'
            | 'warning'
            | 'delete'
        }
        onClose={() => parkingStore.hideAlert()}
        onConfirm={parkingStore.getAlertOnConfirm() || undefined}
      />

      {/* Success Dialog */}
      <SuccessDialog
        visible={parkingStore.dialogState.visible}
        onClose={() => parkingStore.hideDialog()}
        isSuccess={parkingStore.dialogState.isSuccess}
        message={parkingStore.dialogState.message}
        subMessage={parkingStore.dialogState.subMessage}
      />
    </View>
  )
})

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    backgroundGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    headerTitle: {
      marginBottom: 4,
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.palette.neutral600,
    },
    listContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 180,
    },
    vehicleCard: {
      borderRadius: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.palette.neutral100,
      shadowColor: theme.colors.palette.neutral900,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    vehicleGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    vehicleIconContainer: {
      marginRight: 16,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.primary100,
    },
    vehicleContent: {
      flex: 1,
    },
    plateNumber: {
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: theme.colors.palette.neutral900,
      marginBottom: 4,
    },
    vehicleNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      columnGap: 6,
      marginBottom: 8,
    },
    vehicleName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.palette.neutral700,
    },
    vehicleNickname: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.palette.neutral600,
    },
    vehicleDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    detailBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      gap: 4,
      backgroundColor: theme.colors.palette.primary100,
    },
    detailText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.palette.primary600,
    },
    deleteButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
      backgroundColor: theme.colors.palette.angry100,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: 32,
    },
    emptyIconContainer: {
      marginBottom: 24,
    },
    emptyIconGradient: {
      width: 140,
      height: 140,
      borderRadius: 70,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.palette.neutral900,
      marginBottom: 12,
    },
    emptySubtext: {
      fontSize: 15,
      color: theme.colors.palette.neutral500,
      textAlign: 'center',
      lineHeight: 22,
    },
    emptyButton: {
      borderRadius: 16,
      marginTop: 32,
      overflow: 'hidden',
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    emptyButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 28,
      gap: 8,
    },
    emptyButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.palette.neutral100,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 110,
      width: 64,
      height: 64,
      borderRadius: 32,
      shadowColor: theme.colors.palette.primary500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    fabGradient: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

export default VehiclesScreen
