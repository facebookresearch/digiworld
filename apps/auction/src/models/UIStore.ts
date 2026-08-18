import { Instance, types } from 'mobx-state-tree'

import { withSetPropAction } from './helpers/withSetPropAction'

// Dialog state model
// Note: onClose callbacks cannot be stored in MST - handle them in components
const DialogState = types.model('DialogState', {
  visible: types.optional(types.boolean, false),
  type: types.optional(
    types.enumeration('DialogType', ['success', 'error', 'info']),
    'info',
  ),
  title: types.maybeNull(types.string),
  message: types.optional(types.string, ''),
  // Store a callback ID or action type instead of the function
  callbackAction: types.maybeNull(types.string), // e.g., 'navigate_back', 'reset_form', etc.
})

// Item Detail Screen form state
const ItemDetailFormState = types.model('ItemDetailFormState', {
  // Dialog state
  dialog: types.optional(DialogState, {}),
  // Edit mode state
  showEditMode: types.optional(types.boolean, false),
  isEditing: types.optional(types.boolean, false),
  showDeleteConfirm: types.optional(types.boolean, false),
  showEndListingConfirm: types.optional(types.boolean, false),
  // Loading states
  isBidding: types.optional(types.boolean, false),
  isBuying: types.optional(types.boolean, false),
  // Edit form fields
  editTitle: types.optional(types.string, ''),
  editDescription: types.optional(types.string, ''),
  editPrice: types.optional(types.string, ''),
  editStartingBid: types.optional(types.string, ''),
  editBidIncrement: types.optional(types.string, '1.00'),
  editEndDays: types.optional(types.string, '7'),
  editQuantity: types.optional(types.string, '1'),
  editCategoryId: types.maybeNull(types.number),
  editIsAuction: types.optional(types.boolean, false),
  itemImage: types.maybeNull(types.string),
  currentFocused: types.maybeNull(types.string),
})

// Sell Screen form state
const SellFormState = types.model('SellFormState', {
  title: types.optional(types.string, ''),
  description: types.optional(types.string, ''),
  categoryId: types.maybeNull(types.number),
  price: types.optional(types.string, ''),
  isAuction: types.optional(types.boolean, false),
  startingBid: types.optional(types.string, ''),
  bidIncrement: types.optional(types.string, '1.00'),
  endDays: types.optional(types.string, '7'),
  quantity: types.optional(types.string, '1'),
  itemImage: types.maybeNull(types.string),
  dialog: types.optional(DialogState, {}),
  currentFocused: types.maybeNull(types.string),
})

// Search Screen state
const SearchState = types.model('SearchState', {
  searchQuery: types.optional(types.string, ''),
  debouncedQuery: types.optional(types.string, ''),
})

// Browse Screen state
const BrowseState = types.model('BrowseState', {
  searchQuery: types.optional(types.string, ''),
  // Category pagination state
  categoryPagination: types.optional(
    types.model('CategoryPaginationState', {
      page: types.optional(types.number, 1),
      loading: types.optional(types.boolean, false),
      allItemsLoaded: types.optional(types.boolean, false),
      categoryId: types.maybeNull(types.number),
    }),
    {},
  ),
})

// Transaction Filter state
const TransactionFilterState = types.model('TransactionFilterState', {
  activeFilter: types.optional(types.string, 'all'),
})

// Transaction Details Screen state
const TransactionDetailsState = types.model('TransactionDetailsState', {
  loading: types.optional(types.boolean, false),
  isCancelling: types.optional(types.boolean, false),
  showCancelConfirm: types.optional(types.boolean, false),
  dialog: types.optional(DialogState, {}),
})

// Add Payment Method Screen form state
const AddPaymentMethodFormState = types.model('AddPaymentMethodFormState', {
  cardNumber: types.optional(types.string, ''),
  expiry: types.optional(types.string, ''),
  cvv: types.optional(types.string, ''),
  cardHolderName: types.optional(types.string, ''),
  isDefault: types.optional(types.boolean, false),
  isLoading: types.optional(types.boolean, false),
  dialog: types.optional(DialogState, {}),
  currentFocused: types.maybeNull(types.string),
})

// Bid Form state (used in BidForm component)
const BidFormState = types.model('BidFormState', {
  bidAmount: types.optional(types.string, ''),
  error: types.maybeNull(types.string),
})

// Payment Form state (used in PaymentForm component)
const PaymentFormState = types.model('PaymentFormState', {
  selectedCardId: types.maybeNull(types.number),
  error: types.maybeNull(types.string),
})

export const UIStore = types
  .model('UIStore')
  .props({
    isDeeplinkLoading: types.optional(types.boolean, false),
    storagePermissionUri: types.maybeNull(types.string),
    isDrawerOpen: types.optional(types.boolean, false),

    // Focus tracking
    currentFocusedElement: types.maybeNull(types.string),

    // Form states for different screens
    itemDetailForm: types.optional(ItemDetailFormState, {}),
    sellForm: types.optional(SellFormState, {}),
    searchState: types.optional(SearchState, {}),
    browseState: types.optional(BrowseState, {}),
    transactionFilter: types.optional(TransactionFilterState, {}),
    transactionDetails: types.optional(TransactionDetailsState, {}),
    addPaymentMethodForm: types.optional(AddPaymentMethodFormState, {}),
    bidForm: types.optional(BidFormState, {}),
    paymentForm: types.optional(PaymentFormState, {}),

    // Common dialog state (for screens that don't have their own dialog)
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

    // Item Detail Form actions
    setItemDetailDialog(config: {
      visible: boolean
      type?: 'success' | 'error' | 'info'
      title?: string
      message: string
      callbackAction?: string
    }) {
      store.itemDetailForm.dialog.visible = config.visible
      store.itemDetailForm.dialog.type = config.type || 'info'
      store.itemDetailForm.dialog.title = config.title || null
      store.itemDetailForm.dialog.message = config.message || ''
      store.itemDetailForm.dialog.callbackAction = config.callbackAction || null
    },
    hideItemDetailDialog() {
      store.itemDetailForm.dialog.visible = false
      store.itemDetailForm.dialog.type = 'info'
      store.itemDetailForm.dialog.title = null
      store.itemDetailForm.dialog.message = ''
      store.itemDetailForm.dialog.callbackAction = null
    },
    setShowEditMode(show: boolean) {
      store.itemDetailForm.showEditMode = show
    },
    setIsEditing(editing: boolean) {
      store.itemDetailForm.isEditing = editing
    },
    setShowDeleteConfirm(show: boolean) {
      store.itemDetailForm.showDeleteConfirm = show
    },
    setShowEndListingConfirm(show: boolean) {
      store.itemDetailForm.showEndListingConfirm = show
    },
    setIsBidding(bidding: boolean) {
      store.itemDetailForm.isBidding = bidding
    },
    setIsBuying(buying: boolean) {
      store.itemDetailForm.isBuying = buying
    },
    setEditTitle(title: string) {
      store.itemDetailForm.editTitle = title
    },
    setEditDescription(description: string) {
      store.itemDetailForm.editDescription = description
    },
    setEditPrice(price: string) {
      store.itemDetailForm.editPrice = price
    },
    setEditStartingBid(bid: string) {
      store.itemDetailForm.editStartingBid = bid
    },
    setEditBidIncrement(increment: string) {
      store.itemDetailForm.editBidIncrement = increment
    },
    setEditEndDays(days: string) {
      store.itemDetailForm.editEndDays = days
    },
    setEditQuantity(quantity: string) {
      store.itemDetailForm.editQuantity = quantity
    },
    setEditCategoryId(categoryId: number | null) {
      store.itemDetailForm.editCategoryId = categoryId
    },
    setEditIsAuction(isAuction: boolean) {
      store.itemDetailForm.editIsAuction = isAuction
    },
    setItemImage(image: string | null) {
      store.itemDetailForm.itemImage = image
    },
    setItemDetailFocused(field: string | null) {
      store.itemDetailForm.currentFocused = field
    },
    resetItemDetailForm() {
      store.itemDetailForm.showEditMode = false
      store.itemDetailForm.isEditing = false
      store.itemDetailForm.showDeleteConfirm = false
      store.itemDetailForm.showEndListingConfirm = false
      store.itemDetailForm.isBidding = false
      store.itemDetailForm.isBuying = false
      store.itemDetailForm.editTitle = ''
      store.itemDetailForm.editDescription = ''
      store.itemDetailForm.editPrice = ''
      store.itemDetailForm.editStartingBid = ''
      store.itemDetailForm.editBidIncrement = '1.00'
      store.itemDetailForm.editEndDays = '7'
      store.itemDetailForm.editQuantity = '1'
      store.itemDetailForm.editCategoryId = null
      store.itemDetailForm.editIsAuction = false
      store.itemDetailForm.itemImage = null
      store.itemDetailForm.currentFocused = null
      // Don't hide dialog during cleanup - let it handle its own lifecycle
      // The dialog will be hidden when user interacts with it or when explicitly closed
    },

    // Sell Form actions
    setSellTitle(title: string) {
      store.sellForm.title = title
    },
    setSellDescription(description: string) {
      store.sellForm.description = description
    },
    setSellCategoryId(categoryId: number | null) {
      store.sellForm.categoryId = categoryId
    },
    setSellPrice(price: string) {
      store.sellForm.price = price
    },
    setSellIsAuction(isAuction: boolean) {
      store.sellForm.isAuction = isAuction
    },
    setSellStartingBid(bid: string) {
      store.sellForm.startingBid = bid
    },
    setSellBidIncrement(increment: string) {
      store.sellForm.bidIncrement = increment
    },
    setSellEndDays(days: string) {
      store.sellForm.endDays = days
    },
    setSellQuantity(quantity: string) {
      store.sellForm.quantity = quantity
    },
    setSellItemImage(image: string | null) {
      store.sellForm.itemImage = image
    },
    setSellFocused(field: string | null) {
      store.sellForm.currentFocused = field
    },
    setSellDialog(config: {
      visible: boolean
      type?: 'success' | 'error' | 'info'
      title?: string
      message: string
      callbackAction?: string
    }) {
      store.sellForm.dialog.visible = config.visible
      store.sellForm.dialog.type = config.type || 'info'
      store.sellForm.dialog.title = config.title || null
      store.sellForm.dialog.message = config.message || ''
      store.sellForm.dialog.callbackAction = config.callbackAction || null
    },
    hideSellDialog() {
      store.sellForm.dialog.visible = false
      store.sellForm.dialog.type = 'info'
      store.sellForm.dialog.title = null
      store.sellForm.dialog.message = ''
      store.sellForm.dialog.callbackAction = null
    },
    resetSellForm() {
      store.sellForm.title = ''
      store.sellForm.description = ''
      store.sellForm.categoryId = null
      store.sellForm.price = ''
      store.sellForm.isAuction = false
      store.sellForm.startingBid = ''
      store.sellForm.bidIncrement = '1.00'
      store.sellForm.endDays = '7'
      store.sellForm.quantity = '1'
      store.sellForm.itemImage = null
      store.sellForm.currentFocused = null
      this.hideSellDialog()
    },

    // Search State actions
    setSearchQuery(query: string) {
      store.searchState.searchQuery = query
    },
    setDebouncedQuery(query: string) {
      store.searchState.debouncedQuery = query
    },
    resetSearchState() {
      store.searchState.searchQuery = ''
      store.searchState.debouncedQuery = ''
    },

    // Browse State actions
    setBrowseSearchQuery(query: string) {
      store.browseState.searchQuery = query
    },
    // Category Pagination actions
    setCategoryPaginationPage(page: number) {
      store.browseState.categoryPagination.page = page
    },
    setCategoryPaginationLoading(loading: boolean) {
      store.browseState.categoryPagination.loading = loading
    },
    setCategoryPaginationAllItemsLoaded(allItemsLoaded: boolean) {
      store.browseState.categoryPagination.allItemsLoaded = allItemsLoaded
    },
    setCategoryPaginationCategoryId(categoryId: number | null) {
      store.browseState.categoryPagination.categoryId = categoryId
    },
    resetCategoryPagination() {
      store.browseState.categoryPagination.page = 1
      store.browseState.categoryPagination.loading = false
      store.browseState.categoryPagination.allItemsLoaded = false
      store.browseState.categoryPagination.categoryId = null
    },
    resetBrowseState() {
      store.browseState.searchQuery = ''
      this.resetCategoryPagination()
    },

    // Transaction Filter actions
    setTransactionFilter(filter: string) {
      store.transactionFilter.activeFilter = filter
    },
    resetTransactionFilter() {
      store.transactionFilter.activeFilter = 'all'
    },

    // Transaction Details actions
    setTransactionDetailsLoading(loading: boolean) {
      store.transactionDetails.loading = loading
    },
    setTransactionDetailsCancelling(cancelling: boolean) {
      store.transactionDetails.isCancelling = cancelling
    },
    setShowCancelConfirm(show: boolean) {
      store.transactionDetails.showCancelConfirm = show
    },
    setTransactionDetailsDialog(config: {
      visible: boolean
      type?: 'success' | 'error' | 'info'
      title?: string
      message: string
      callbackAction?: string
    }) {
      store.transactionDetails.dialog.visible = config.visible
      store.transactionDetails.dialog.type = config.type || 'info'
      store.transactionDetails.dialog.title = config.title || null
      store.transactionDetails.dialog.message = config.message || ''
      store.transactionDetails.dialog.callbackAction =
        config.callbackAction || null
    },
    hideTransactionDetailsDialog() {
      store.transactionDetails.dialog.visible = false
      store.transactionDetails.dialog.type = 'info'
      store.transactionDetails.dialog.title = null
      store.transactionDetails.dialog.message = ''
    },
    resetTransactionDetails() {
      store.transactionDetails.loading = false
      store.transactionDetails.isCancelling = false
      store.transactionDetails.showCancelConfirm = false
      this.hideTransactionDetailsDialog()
    },

    // Add Payment Method Form actions
    setCardNumber(cardNumber: string) {
      store.addPaymentMethodForm.cardNumber = cardNumber
    },
    setExpiry(expiry: string) {
      store.addPaymentMethodForm.expiry = expiry
    },
    setCvv(cvv: string) {
      store.addPaymentMethodForm.cvv = cvv
    },
    setCardHolderName(name: string) {
      store.addPaymentMethodForm.cardHolderName = name
    },
    setIsDefault(isDefault: boolean) {
      store.addPaymentMethodForm.isDefault = isDefault
    },
    setAddPaymentMethodLoading(loading: boolean) {
      store.addPaymentMethodForm.isLoading = loading
    },
    setAddPaymentMethodFocused(field: string | null) {
      store.addPaymentMethodForm.currentFocused = field
    },
    setAddPaymentMethodDialog(config: {
      visible: boolean
      type?: 'success' | 'error' | 'info'
      title?: string
      message: string
    }) {
      store.addPaymentMethodForm.dialog.visible = config.visible
      store.addPaymentMethodForm.dialog.type = config.type || 'info'
      store.addPaymentMethodForm.dialog.title = config.title || null
      store.addPaymentMethodForm.dialog.message = config.message || ''
    },
    hideAddPaymentMethodDialog() {
      store.addPaymentMethodForm.dialog.visible = false
      store.addPaymentMethodForm.dialog.type = 'info'
      store.addPaymentMethodForm.dialog.title = null
      store.addPaymentMethodForm.dialog.message = ''
    },
    resetAddPaymentMethodForm() {
      store.addPaymentMethodForm.cardNumber = ''
      store.addPaymentMethodForm.expiry = ''
      store.addPaymentMethodForm.cvv = ''
      store.addPaymentMethodForm.cardHolderName = ''
      store.addPaymentMethodForm.isDefault = false
      store.addPaymentMethodForm.isLoading = false
      store.addPaymentMethodForm.currentFocused = null
      this.hideAddPaymentMethodDialog()
    },

    // Bid Form actions
    setBidAmount(amount: string) {
      store.bidForm.bidAmount = amount
    },
    setBidFormError(error: string | null) {
      store.bidForm.error = error
    },
    resetBidForm() {
      store.bidForm.bidAmount = ''
      store.bidForm.error = null
    },

    // Payment Form actions
    setPaymentFormSelectedCardId(cardId: number | null) {
      store.paymentForm.selectedCardId = cardId
    },
    setPaymentFormError(error: string | null) {
      store.paymentForm.error = error
    },
    resetPaymentForm() {
      store.paymentForm.selectedCardId = null
      store.paymentForm.error = null
    },

    // Common Dialog actions
    showDialog(config: {
      visible: boolean
      type?: 'success' | 'error' | 'info'
      title?: string
      message: string
      callbackAction?: string
    }) {
      store.dialogState.visible = config.visible
      store.dialogState.type = config.type || 'info'
      store.dialogState.title = config.title || null
      store.dialogState.message = config.message || ''
      store.dialogState.callbackAction = config.callbackAction || null
    },
    hideDialog() {
      store.dialogState.visible = false
      store.dialogState.type = 'info'
      store.dialogState.title = null
      store.dialogState.message = ''
      store.dialogState.callbackAction = null
    },

    // Reset all forms
    resetAllForms() {
      this.resetItemDetailForm()
      this.resetSellForm()
      this.resetSearchState()
      this.resetBrowseState()
      this.resetTransactionFilter()
      this.resetTransactionDetails()
      this.resetAddPaymentMethodForm()
      this.resetBidForm()
      this.resetPaymentForm()
      this.hideDialog()
      store.currentFocusedElement = null
    },
    // Reset bid and payment forms (called when item detail screen unmounts)
    resetItemForms() {
      this.resetBidForm()
      this.resetPaymentForm()
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
      if (data.itemDetailForm) {
        Object.assign(store.itemDetailForm, data.itemDetailForm)
      }
      if (data.sellForm) {
        Object.assign(store.sellForm, data.sellForm)
      }
      if (data.searchState) {
        Object.assign(store.searchState, data.searchState)
      }
      if (data.browseState) {
        Object.assign(store.browseState, data.browseState)
      }
      if (data.transactionFilter) {
        Object.assign(store.transactionFilter, data.transactionFilter)
      }
      if (data.transactionDetails) {
        Object.assign(store.transactionDetails, data.transactionDetails)
      }
      if (data.addPaymentMethodForm) {
        Object.assign(store.addPaymentMethodForm, data.addPaymentMethodForm)
      }
      if (data.bidForm) {
        Object.assign(store.bidForm, data.bidForm)
      }
      if (data.paymentForm) {
        Object.assign(store.paymentForm, data.paymentForm)
      }
      if (data.dialogState) {
        Object.assign(store.dialogState, data.dialogState)
      }
    },
  }))

export interface UIStoreModel extends Instance<typeof UIStore> {}
