import { Instance, types } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

// Form state models for different screens
const TransferFormState = types.model('TransferFormState', {
  fromAccountId: types.maybeNull(types.number),
  toAccountId: types.maybeNull(types.number),
  amount: types.optional(types.string, ''),
  pin: types.optional(types.string, ''),
  showPinInput: types.optional(types.boolean, false),
  isProcessing: types.optional(types.boolean, false),
  showSuccess: types.optional(types.boolean, false),
  transferResult: types.maybeNull(types.frozen()),
  showFromDropdown: types.optional(types.boolean, false),
  showToDropdown: types.optional(types.boolean, false),
  currentFocused: types.maybeNull(types.string),
})

const TransactionFilterState = types.model('TransactionFilterState', {
  activeFilter: types.optional(types.string, 'all'),
  activeDateRange: types.optional(types.string, 'month'),
  isDrawerOpen: types.optional(types.boolean, false),
  page: types.optional(types.number, 1),
  hasMore: types.optional(types.boolean, true),
  isSessionLoaded: types.optional(types.boolean, false),
})

const AddPayeeFormState = types.model('AddPayeeFormState', {
  searchQuery: types.optional(types.string, ''),
  isLoading: types.optional(types.boolean, false),
  currentFocused: types.maybeNull(types.string),
})

const ManualPayeeFormState = types.model('ManualPayeeFormState', {
  billerName: types.optional(types.string, ''),
  billerAccountNumber: types.optional(types.string, ''),
  billerRoutingNumber: types.optional(types.string, ''),
  billerAddress: types.optional(types.string, ''),
  billerPhone: types.optional(types.string, ''),
  nickname: types.optional(types.string, ''),
  category: types.optional(types.string, 'utilities'),
  description: types.optional(types.string, ''),
  isLoading: types.optional(types.boolean, false),
  showCategoryPicker: types.optional(types.boolean, false),
  currentFocused: types.maybeNull(types.string),
})

const SchedulePaymentFormState = types.model('SchedulePaymentFormState', {
  selectedBillerId: types.maybeNull(types.number),
  paymentMethod: types.optional(types.string, 'account'),
  selectedAccountId: types.maybeNull(types.number),
  selectedCreditCardId: types.maybeNull(types.number),
  showAccountPicker: types.optional(types.boolean, false),
  showCreditCardPicker: types.optional(types.boolean, false),
  showBillerPicker: types.optional(types.boolean, false),
  paymentAmount: types.optional(types.string, ''),
  scheduledDate: types.optional(types.string, ''),
  showDatePicker: types.optional(types.boolean, false),
  showTimePicker: types.optional(types.boolean, false),
  notes: types.optional(types.string, ''),
  isLoading: types.optional(types.boolean, false),
  showPinModal: types.optional(types.boolean, false),
  pin: types.optional(types.string, ''),
  currentFocused: types.maybeNull(types.string),
})

const AllBillsFilterState = types.model('AllBillsFilterState', {
  refreshing: types.optional(types.boolean, false),
  filter: types.optional(types.string, 'all'),
})

const PayBillFormState = types.model('PayBillFormState', {
  selectedBill: types.maybeNull(types.frozen()),
  selectedBiller: types.maybeNull(types.frozen()),
  targetCreditCard: types.maybeNull(types.frozen()),
  paymentMethod: types.optional(types.string, 'account'),
  selectedAccountId: types.maybeNull(types.number),
  selectedCreditCardId: types.maybeNull(types.number),
  showAccountPicker: types.optional(types.boolean, false),
  showCreditCardPicker: types.optional(types.boolean, false),
  paymentAmount: types.optional(types.string, ''),
  isLoading: types.optional(types.boolean, false),
  showPinModal: types.optional(types.boolean, false),
  pin: types.optional(types.string, ''),
  currentFocused: types.maybeNull(types.string),
})

const DialogState = types.model('DialogState', {
  visible: types.optional(types.boolean, false),
  isSuccess: types.optional(types.boolean, true),
  message: types.optional(types.string, ''),
  subMessage: types.optional(types.string, ''),
})

export const UIStore = types
  .model('UIStore')
  .props({
    isDeeplinkLoading: types.optional(types.boolean, false),
    storagePermissionUri: types.maybeNull(types.string),
    isDrawerOpen: types.optional(types.boolean, false),
    // Video edit screen dialogs (keeping for compatibility)
    deleteVideoAlertVisible: types.optional(types.boolean, false),
    saveVideoAlertVisible: types.optional(types.boolean, false),
    // Comment section dialogs (keeping for compatibility)
    toggleCommentDialog: types.optional(types.boolean, false),
    deleteCommentDialogVisible: types.optional(types.boolean, false),
    actionCommentId: types.maybeNull(types.number),
    // Upload animation state (keeping for compatibility)
    showUploadAnimation: types.optional(types.boolean, false),
    showUploadSuccess: types.optional(types.boolean, false),

    // Focus tracking
    currentFocusedElement: types.maybeNull(types.string),

    // Form states for different screens
    transferForm: types.optional(TransferFormState, {}),
    transactionFilter: types.optional(TransactionFilterState, {}),
    addPayeeForm: types.optional(AddPayeeFormState, {}),
    manualPayeeForm: types.optional(ManualPayeeFormState, {}),
    schedulePaymentForm: types.optional(SchedulePaymentFormState, {}),
    allBillsFilter: types.optional(AllBillsFilterState, {}),
    payBillForm: types.optional(PayBillFormState, {}),

    // Common dialog state
    dialogState: types.optional(DialogState, {}),
  })
  .actions(withSetPropAction)
  .actions(store => ({
    setDeeplinkLoading(loading: boolean) {
      store.isDeeplinkLoading = loading
    },
    setStoragePermissionUri(uri: string | null) {
      store.storagePermissionUri = uri
    },
    setDrawerOpen(isOpen: boolean) {
      store.isDrawerOpen = isOpen
    },

    // Focus tracking actions
    setCurrentFocusedElement(elementId: string | null) {
      store.currentFocusedElement = elementId
    },

    // Transfer form actions
    setTransferFromAccount(accountId: number | null) {
      store.transferForm.fromAccountId = accountId
      if (store.transferForm.toAccountId === accountId) {
        store.transferForm.toAccountId = null
      }
      store.transferForm.showFromDropdown = false
    },
    setTransferToAccount(accountId: number | null) {
      store.transferForm.toAccountId = accountId
      store.transferForm.showToDropdown = false
    },
    setTransferAmount(amount: string) {
      store.transferForm.amount = amount
    },
    setTransferFocused(field: string | null) {
      store.transferForm.currentFocused = field
    },
    setTransferPin(pin: string) {
      store.transferForm.pin = pin
    },
    toggleTransferPinInput(show: boolean) {
      store.transferForm.showPinInput = show
      if (!show) {
        store.transferForm.pin = ''
      }
    },
    setTransferProcessing(processing: boolean) {
      store.transferForm.isProcessing = processing
    },
    setTransferSuccess(success: boolean, result?: any) {
      store.transferForm.showSuccess = success
      store.transferForm.transferResult = result || null
    },
    toggleTransferFromDropdown() {
      store.transferForm.showFromDropdown = !store.transferForm.showFromDropdown
      store.transferForm.showToDropdown = false
    },
    toggleTransferToDropdown() {
      store.transferForm.showToDropdown = !store.transferForm.showToDropdown
      store.transferForm.showFromDropdown = false
    },
    resetTransferForm() {
      store.transferForm.fromAccountId = null
      store.transferForm.toAccountId = null
      store.transferForm.amount = ''
      store.transferForm.pin = ''
      store.transferForm.showPinInput = false
      store.transferForm.isProcessing = false
      store.transferForm.showSuccess = false
      store.transferForm.transferResult = null
      store.transferForm.showFromDropdown = false
      store.transferForm.showToDropdown = false
      store.transferForm.currentFocused = null
    },

    // Transaction filter actions
    setTransactionFilter(filter: string) {
      store.transactionFilter.activeFilter = filter
    },
    setTransactionDateRange(range: string) {
      store.transactionFilter.activeDateRange = range
    },
    toggleTransactionDrawer() {
      store.transactionFilter.isDrawerOpen =
        !store.transactionFilter.isDrawerOpen
    },
    setTransactionDrawer(open: boolean) {
      store.transactionFilter.isDrawerOpen = open
    },
    setTransactionPage(page: number) {
      store.transactionFilter.page = page
    },
    setTransactionHasMore(hasMore: boolean) {
      store.transactionFilter.hasMore = hasMore
    },
    setTransactionSessionLoaded(loaded: boolean) {
      store.transactionFilter.isSessionLoaded = loaded
    },
    resetTransactionFilter() {
      store.transactionFilter.activeFilter = 'all'
      store.transactionFilter.activeDateRange = 'month'
      store.transactionFilter.isDrawerOpen = false
      store.transactionFilter.page = 1
      store.transactionFilter.hasMore = true
      store.transactionFilter.isSessionLoaded = false
    },

    // Add payee form actions
    setAddPayeeSearchQuery(query: string) {
      store.addPayeeForm.searchQuery = query
    },
    setAddPayeeFocused(field: string | null) {
      store.addPayeeForm.currentFocused = field
    },
    setAddPayeeLoading(loading: boolean) {
      store.addPayeeForm.isLoading = loading
    },
    resetAddPayeeForm() {
      store.addPayeeForm.searchQuery = ''
      store.addPayeeForm.isLoading = false
      store.addPayeeForm.currentFocused = null
    },

    // Manual payee form actions
    setManualPayeeBillerName(name: string) {
      store.manualPayeeForm.billerName = name
    },
    setManualPayeeAccountNumber(number: string) {
      store.manualPayeeForm.billerAccountNumber = number
    },
    setManualPayeeRoutingNumber(number: string) {
      store.manualPayeeForm.billerRoutingNumber = number
    },
    setManualPayeeAddress(address: string) {
      store.manualPayeeForm.billerAddress = address
    },
    setManualPayeePhone(phone: string) {
      store.manualPayeeForm.billerPhone = phone
    },
    setManualPayeeNickname(nickname: string) {
      store.manualPayeeForm.nickname = nickname
    },
    setManualPayeeCategory(category: string) {
      store.manualPayeeForm.category = category
    },
    setManualPayeeDescription(description: string) {
      store.manualPayeeForm.description = description
    },
    setManualPayeeFocused(field: string | null) {
      store.manualPayeeForm.currentFocused = field
    },
    setManualPayeeLoading(loading: boolean) {
      store.manualPayeeForm.isLoading = loading
    },
    toggleManualPayeeCategoryPicker() {
      store.manualPayeeForm.showCategoryPicker =
        !store.manualPayeeForm.showCategoryPicker
    },
    resetManualPayeeForm() {
      store.manualPayeeForm.billerName = ''
      store.manualPayeeForm.billerAccountNumber = ''
      store.manualPayeeForm.billerRoutingNumber = ''
      store.manualPayeeForm.billerAddress = ''
      store.manualPayeeForm.billerPhone = ''
      store.manualPayeeForm.nickname = ''
      store.manualPayeeForm.category = 'utilities'
      store.manualPayeeForm.description = ''
      store.manualPayeeForm.isLoading = false
      store.manualPayeeForm.showCategoryPicker = false
      store.manualPayeeForm.currentFocused = null
    },

    // Schedule payment form actions
    setSchedulePaymentBiller(billerId: number | null) {
      store.schedulePaymentForm.selectedBillerId = billerId
      store.schedulePaymentForm.showBillerPicker = false
    },
    setSchedulePaymentMethod(method: string) {
      store.schedulePaymentForm.paymentMethod = method
    },
    setSchedulePaymentAccount(accountId: number | null) {
      store.schedulePaymentForm.selectedAccountId = accountId
      store.schedulePaymentForm.showAccountPicker = false
    },
    setSchedulePaymentCreditCard(cardId: number | null) {
      store.schedulePaymentForm.selectedCreditCardId = cardId
      store.schedulePaymentForm.showCreditCardPicker = false
    },
    setSchedulePaymentAmount(amount: string) {
      store.schedulePaymentForm.paymentAmount = amount
    },
    setSchedulePaymentDate(date: string) {
      store.schedulePaymentForm.scheduledDate = date
    },
    setSchedulePaymentNotes(notes: string) {
      store.schedulePaymentForm.notes = notes
    },
    setSchedulePaymentFocused(field: string | null) {
      store.schedulePaymentForm.currentFocused = field
    },
    setSchedulePaymentPin(pin: string) {
      store.schedulePaymentForm.pin = pin
    },
    setSchedulePaymentLoading(loading: boolean) {
      store.schedulePaymentForm.isLoading = loading
    },
    toggleSchedulePaymentAccountPicker() {
      store.schedulePaymentForm.showAccountPicker =
        !store.schedulePaymentForm.showAccountPicker
      store.schedulePaymentForm.showCreditCardPicker = false
      store.schedulePaymentForm.showBillerPicker = false
    },
    toggleSchedulePaymentCreditCardPicker() {
      store.schedulePaymentForm.showCreditCardPicker =
        !store.schedulePaymentForm.showCreditCardPicker
      store.schedulePaymentForm.showAccountPicker = false
      store.schedulePaymentForm.showBillerPicker = false
    },
    toggleSchedulePaymentBillerPicker() {
      store.schedulePaymentForm.showBillerPicker =
        !store.schedulePaymentForm.showBillerPicker
      store.schedulePaymentForm.showAccountPicker = false
      store.schedulePaymentForm.showCreditCardPicker = false
    },
    toggleSchedulePaymentDatePicker() {
      store.schedulePaymentForm.showDatePicker =
        !store.schedulePaymentForm.showDatePicker
    },
    toggleSchedulePaymentTimePicker() {
      store.schedulePaymentForm.showTimePicker =
        !store.schedulePaymentForm.showTimePicker
    },
    toggleSchedulePaymentPinModal() {
      store.schedulePaymentForm.showPinModal =
        !store.schedulePaymentForm.showPinModal
      if (!store.schedulePaymentForm.showPinModal) {
        store.schedulePaymentForm.pin = ''
      }
    },
    resetSchedulePaymentForm() {
      store.schedulePaymentForm.selectedBillerId = null
      store.schedulePaymentForm.paymentMethod = 'account'
      store.schedulePaymentForm.selectedAccountId = null
      store.schedulePaymentForm.selectedCreditCardId = null
      store.schedulePaymentForm.showAccountPicker = false
      store.schedulePaymentForm.showCreditCardPicker = false
      store.schedulePaymentForm.showBillerPicker = false
      store.schedulePaymentForm.paymentAmount = ''
      store.schedulePaymentForm.scheduledDate = ''
      store.schedulePaymentForm.showDatePicker = false
      store.schedulePaymentForm.showTimePicker = false
      store.schedulePaymentForm.notes = ''
      store.schedulePaymentForm.isLoading = false
      store.schedulePaymentForm.showPinModal = false
      store.schedulePaymentForm.pin = ''
      store.schedulePaymentForm.currentFocused = null
    },

    // All bills filter actions
    setAllBillsRefreshing(refreshing: boolean) {
      store.allBillsFilter.refreshing = refreshing
    },
    setAllBillsFilter(filter: string) {
      store.allBillsFilter.filter = filter
    },
    resetAllBillsFilter() {
      store.allBillsFilter.refreshing = false
      store.allBillsFilter.filter = 'all'
    },

    // Pay bill form actions
    setPayBillSelectedBill(bill: any) {
      store.payBillForm.selectedBill = bill
    },
    setPayBillSelectedBiller(biller: any) {
      store.payBillForm.selectedBiller = biller
    },
    setPayBillTargetCreditCard(card: any) {
      store.payBillForm.targetCreditCard = card
    },
    setPayBillPaymentMethod(method: string) {
      store.payBillForm.paymentMethod = method
    },
    setPayBillSelectedAccount(accountId: number | null) {
      store.payBillForm.selectedAccountId = accountId
      store.payBillForm.showAccountPicker = false
    },
    setPayBillSelectedCreditCard(cardId: number | null) {
      store.payBillForm.selectedCreditCardId = cardId
      store.payBillForm.showCreditCardPicker = false
    },
    togglePayBillAccountPicker() {
      store.payBillForm.showAccountPicker = !store.payBillForm.showAccountPicker
      store.payBillForm.showCreditCardPicker = false
    },
    togglePayBillCreditCardPicker() {
      store.payBillForm.showCreditCardPicker =
        !store.payBillForm.showCreditCardPicker
      store.payBillForm.showAccountPicker = false
    },
    setPayBillAmount(amount: string) {
      store.payBillForm.paymentAmount = amount
    },
    setPayBillFocused(field: string | null) {
      store.payBillForm.currentFocused = field
    },
    setPayBillLoading(loading: boolean) {
      store.payBillForm.isLoading = loading
    },
    setPayBillPin(pin: string) {
      store.payBillForm.pin = pin
    },
    togglePayBillPinModal() {
      store.payBillForm.showPinModal = !store.payBillForm.showPinModal
      if (!store.payBillForm.showPinModal) {
        store.payBillForm.pin = ''
      }
    },
    resetPayBillForm() {
      store.payBillForm.selectedBill = null
      store.payBillForm.selectedBiller = null
      store.payBillForm.targetCreditCard = null
      store.payBillForm.paymentMethod = 'account'
      store.payBillForm.selectedAccountId = null
      store.payBillForm.selectedCreditCardId = null
      store.payBillForm.showAccountPicker = false
      store.payBillForm.showCreditCardPicker = false
      store.payBillForm.paymentAmount = ''
      store.payBillForm.isLoading = false
      store.payBillForm.showPinModal = false
      store.payBillForm.pin = ''
      store.payBillForm.currentFocused = null
    },

    // Dialog actions
    showDialog(config: {
      isSuccess: boolean
      message: string
      subMessage: string
    }) {
      store.dialogState.visible = true
      store.dialogState.isSuccess = config.isSuccess
      store.dialogState.message = config.message
      store.dialogState.subMessage = config.subMessage
    },
    hideDialog() {
      store.dialogState.visible = false
      store.dialogState.isSuccess = true
      store.dialogState.message = ''
      store.dialogState.subMessage = ''
    },

    // Video edit screen actions (keeping for compatibility)
    showDeleteVideoAlert() {
      store.deleteVideoAlertVisible = true
    },
    hideDeleteVideoAlert() {
      store.deleteVideoAlertVisible = false
    },
    showSaveVideoAlert() {
      store.saveVideoAlertVisible = true
    },
    hideSaveVideoAlert() {
      store.saveVideoAlertVisible = false
    },
    // Comment section actions (keeping for compatibility)
    showHideCommentDialog(commentId: number) {
      store.toggleCommentDialog = true
      store.actionCommentId = commentId
    },
    hideHideCommentDialog() {
      store.toggleCommentDialog = false
      store.actionCommentId = null
    },
    showDeleteCommentDialog(commentId: number) {
      store.deleteCommentDialogVisible = true
      store.actionCommentId = commentId
    },
    hideDeleteCommentDialog() {
      store.deleteCommentDialogVisible = false
      store.actionCommentId = null
    },
    // Upload animation actions (keeping for compatibility)
    showUploadAnimationModal() {
      store.showUploadAnimation = true
      store.showUploadSuccess = false
    },
    hideUploadAnimationModal() {
      store.showUploadAnimation = false
      store.showUploadSuccess = false
    },
    showUploadSuccessState() {
      store.showUploadSuccess = true
    },
    resetDialogs() {
      store.deleteVideoAlertVisible = false
      store.saveVideoAlertVisible = false
      store.toggleCommentDialog = false
      store.deleteCommentDialogVisible = false
      store.actionCommentId = null
      store.showUploadAnimation = false
      store.showUploadSuccess = false
    },

    // Reset all forms
    resetAllForms() {
      this.resetTransferForm()
      this.resetTransactionFilter()
      this.resetAddPayeeForm()
      this.resetManualPayeeForm()
      this.resetSchedulePaymentForm()
      this.resetAllBillsFilter()
      this.resetPayBillForm()
      this.hideDialog()
      store.currentFocusedElement = null
    },

    restore(data: any) {
      if (data.isDeeplinkLoading !== undefined) {
        store.isDeeplinkLoading = data.isDeeplinkLoading
      }
      if (data.storagePermissionUri !== undefined) {
        store.storagePermissionUri = data.storagePermissionUri
      }
      if (data.currentFocusedElement !== undefined) {
        store.currentFocusedElement = data.currentFocusedElement
      }
      if (data.transferForm) {
        Object.assign(store.transferForm, data.transferForm)
      }
      if (data.transactionFilter) {
        Object.assign(store.transactionFilter, data.transactionFilter)
      }
      if (data.addPayeeForm) {
        Object.assign(store.addPayeeForm, data.addPayeeForm)
      }
      if (data.manualPayeeForm) {
        Object.assign(store.manualPayeeForm, data.manualPayeeForm)
      }
      if (data.schedulePaymentForm) {
        Object.assign(store.schedulePaymentForm, data.schedulePaymentForm)
      }
      if (data.allBillsFilter) {
        Object.assign(store.allBillsFilter, data.allBillsFilter)
      }
      if (data.payBillForm) {
        Object.assign(store.payBillForm, data.payBillForm)
      }
      if (data.dialogState) {
        Object.assign(store.dialogState, data.dialogState)
      }
    },
  }))

export interface UIStoreModel extends Instance<typeof UIStore> {}
