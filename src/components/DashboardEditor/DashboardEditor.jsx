import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { InlineNotification } from 'carbon-components-react';
import classnames from 'classnames';
import update from 'immutability-helper';

import { settings } from '../../constants/Settings';
import {
  DASHBOARD_EDITOR_CARD_TYPES,
  CARD_ACTIONS,
} from '../../constants/LayoutConstants';
import {
  DashboardGrid,
  CardEditor,
  ErrorBoundary,
  SkeletonText,
} from '../../index';

import DashboardEditorHeader from './DashboardEditorHeader/DashboardEditorHeader';
import {
  getDefaultCard,
  getDuplicateCard,
  getCardPreview,
  renderBreakpointInfo,
  handleKeyDown,
  handleOnClick,
} from './editorUtils';

const { iotPrefix } = settings;

export const DataItemsPropTypes = PropTypes.arrayOf(
  PropTypes.shape({
    dataSourceId: PropTypes.string,
    label: PropTypes.string,
  })
);

const propTypes = {
  /** Dashboard title */
  title: PropTypes.string,
  /** initial dashboard data to edit */
  initialValue: PropTypes.shape({
    cards: PropTypes.array,
    layouts: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  }),
  /** supported card types */
  supportedCardTypes: PropTypes.arrayOf(PropTypes.string),
  /** if enabled, renders a ContentSwitcher with IconSwitches that allow for manually changing the breakpoint,
   * regardless of the screen width
   */
  breakpointSwitcher: PropTypes.shape({
    enabled: PropTypes.bool,
    initialValue: PropTypes.string,
  }),
  /** if provided, renders header content above preview */
  renderHeader: PropTypes.func,
  /** if provided, is used to render cards in dashboard
   * renderCardPreview( cardConfig: Object,
                        commonCardProps: Object
                        onSelectCard: Function,
                        onDuplicateCard: Function,
                        onRemoveCard: Function,
                        isSelected: Boolean): Node
   */
  renderCardPreview: PropTypes.func,
  /** if provided, renders array elements inside of BreadcrumbItem in header */
  headerBreadcrumbs: PropTypes.arrayOf(PropTypes.element),
  /** if provided, renders node underneath the header and above the dashboard grid */
  notification: PropTypes.node,
  /** if provided, renders edit button next to title linked to this callback */
  onEditTitle: PropTypes.func,
  /** if provided, returns an array of strings which are the dataItems to be allowed
   * on each card
   * getValidDataItems(card, selectedTimeRange)
   */
  getValidDataItems: PropTypes.func,
  /** if provided, returns an array of strings which are the timeRanges to be allowed
   * on each card
   * getValidTimeRanges(card, selectedDataItems)
   */
  getValidTimeRanges: PropTypes.func,
  /** an array of dataItems to be included on each card
   * this prop will be ignored if getValidDataItems is defined
   */
  dataItems: DataItemsPropTypes,
  /** if provided, will update the dashboard json according to its own logic. Can return a valid card to be rendered
   * onCardChange(updatedCard, template): Card
   */
  onCardChange: PropTypes.func,
  /** if provided, will return the updated layout and layouts
   * onLayoutChange(newLayout, newLayouts)
   */
  onLayoutChange: PropTypes.func,
  /** if provided, renders import button linked to this callback
   * onImport(data, setNotification?)
   */
  onImport: PropTypes.func,
  /** if provided, renders export button linked to this callback
   * onExport(dashboardJson)
   */
  onExport: PropTypes.func,
  /** if provided, renders delete button linked to this callback */
  onDelete: PropTypes.func,
  /** If provided, renders cancel button linked to this callback */
  onCancel: PropTypes.func,
  /** If provided, renders submit button linked to this callback
   * onSubmit(dashboardData)
   */
  onSubmit: PropTypes.func,
  /** Whether to disable the submit button */
  submitDisabled: PropTypes.bool,
  /** If provided, runs the function when the user clicks submit in the Card code JSON editor
   * onValidateCardJson(cardConfig)
   * @returns Array<string> error strings. return empty array if there is no errors
   */
  onValidateCardJson: PropTypes.func,
  /** optional loading prop to render the PageTitleBar loading state */
  isLoading: PropTypes.bool,
  /** internationalization strings */
  i18n: PropTypes.shape({
    headerImportButton: PropTypes.string,
    headerExportButton: PropTypes.string,
    headerCancelButton: PropTypes.string,
    headerSubmitButton: PropTypes.string,
    headerDeleteButton: PropTypes.string,
    headerFitToScreenButton: PropTypes.string,
    headerXlargeButton: PropTypes.string,
    headerLargeButton: PropTypes.string,
    headerMediumButton: PropTypes.string,
    noDataLabel: PropTypes.string,
    defaultCardTitle: PropTypes.string,
    headerEditTitleButton: PropTypes.string,
    galleryHeader: PropTypes.string,
    openGalleryButton: PropTypes.string,
    closeGalleryButton: PropTypes.string,
    openJSONButton: PropTypes.string,
    layoutInfoXl: PropTypes.string,
    layoutInfoLg: PropTypes.string,
    layoutInfoMd: PropTypes.string,
    searchPlaceholderText: PropTypes.string,
  }),
};

const defaultProps = {
  initialValue: {
    cards: [],
    layouts: {},
  },
  breakpointSwitcher: null,
  supportedCardTypes: Object.keys(DASHBOARD_EDITOR_CARD_TYPES),
  renderHeader: null,
  renderCardPreview: () => null,
  headerBreadcrumbs: null,
  notification: null,
  title: '',
  onEditTitle: null,
  getValidDataItems: null,
  getValidTimeRanges: null,
  dataItems: [],
  onCardChange: null,
  onLayoutChange: null,
  onDelete: null,
  onImport: null,
  onExport: null,
  onCancel: null,
  onSubmit: null,
  submitDisabled: false,
  onValidateCardJson: null,
  isLoading: false,
  i18n: {
    headerEditTitleButton: 'Edit title',
    headerImportButton: 'Import',
    headerExportButton: 'Export',
    headerDeleteButton: 'Delete',
    headerCancelButton: 'Cancel',
    headerSubmitButton: 'Save and close',
    headerFitToScreenButton: 'Fit to screen',
    headerXlargeButton: 'X-large view',
    headerLargeButton: 'Large view',
    headerMediumButton: 'Medium view',
    galleryHeader: 'Gallery',
    openGalleryButton: 'Open gallery',
    closeGalleryButton: 'Back',
    openJSONButton: 'Open JSON editor',
    noDataLabel: 'No data source is defined',
    defaultCardTitle: 'Untitled',
    layoutInfoXl: 'Edit dashboard at extra large layout (1056 - 1312px)',
    layoutInfoLg: 'Edit dashboard at large layout (672 - 1056px)',
    layoutInfoMd: 'Edit dashboard at medium layout (480 - 672px)',
    searchPlaceholderText: 'Enter a value',
  },
};

const LAYOUTS = {
  FIT_TO_SCREEN: { breakpoint: 'xl', index: 0 },
  MEDIUM: { breakpoint: 'md', index: 3 },
  LARGE: { breakpoint: 'lg', index: 2 },
  XLARGE: { breakpoint: 'xl', index: 1 },
};
export const baseClassName = `${iotPrefix}--dashboard-editor`;

const DashboardEditor = ({
  title,
  initialValue,
  supportedCardTypes,
  breakpointSwitcher,
  renderHeader,
  renderCardPreview,
  getValidDataItems,
  getValidTimeRanges,
  dataItems,
  headerBreadcrumbs,
  notification,
  onCardChange,
  onLayoutChange,
  onEditTitle,
  onImport,
  onExport,
  onDelete,
  onCancel,
  onSubmit,
  submitDisabled,
  onValidateCardJson,
  isLoading,
  i18n,
}) => {
  const mergedI18n = { ...defaultProps.i18n, ...i18n };

  // show the gallery if no card is being edited
  const [dashboardJson, setDashboardJson] = useState(initialValue);
  const [selectedCardId, setSelectedCardId] = useState();
  const [selectedBreakpointIndex, setSelectedBreakpointIndex] = useState(
    breakpointSwitcher?.initialValue
      ? LAYOUTS[breakpointSwitcher.initialValue].index
      : LAYOUTS.FIT_TO_SCREEN.index
  );
  const [currentBreakpoint, setCurrentBreakpoint] = useState(
    breakpointSwitcher?.initialValue
      ? LAYOUTS[breakpointSwitcher.initialValue].breakpoint
      : LAYOUTS.FIT_TO_SCREEN.breakpoint
  );

  // force a window resize so that react-grid-layout will trigger its reorder / resize
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [selectedBreakpointIndex]);

  /**
   * Adds a default, empty card to the preview
   * @param {string} type card type
   */
  const addCard = (type) => {
    const cardConfig = getDefaultCard(type, mergedI18n);
    setDashboardJson({
      ...dashboardJson,
      cards: [...dashboardJson.cards, cardConfig],
    });
    setSelectedCardId(cardConfig.id);
  };

  /**
   * Adds a cloned card with a new unique id to the preview
   * @param {string} id
   */
  const duplicateCard = (id) => {
    const cardConfig = getDuplicateCard(
      dashboardJson.cards.find((i) => i.id === id)
    );
    setDashboardJson({
      ...dashboardJson,
      cards: [...dashboardJson.cards, cardConfig],
    });
    setSelectedCardId(cardConfig.id);
  };

  /**
   * Deletes a card from the preview
   * @param {string} id
   */
  const removeCard = (id) =>
    setDashboardJson({
      ...dashboardJson,
      cards: dashboardJson.cards.filter((i) => i.id !== id),
    });

  const onSelectCard = (id) => setSelectedCardId(id);
  const onDuplicateCard = (id) => duplicateCard(id);
  const onRemoveCard = (id) => removeCard(id);

  const handleOnCardChange = (cardConfig) =>
    // TODO: this is really inefficient
    setDashboardJson({
      ...dashboardJson,
      cards: dashboardJson.cards.map((card) =>
        card.id === cardConfig.id
          ? onCardChange
            ? onCardChange(cardConfig, dashboardJson)
            : cardConfig
          : card
      ),
    });

  const commonCardProps = (cardConfig, isSelected) => ({
    key: cardConfig.id,
    tooltip: cardConfig.description,
    availableActions: { clone: true, delete: true },
    onCardAction: (id, actionId, payload) => {
      if (actionId === CARD_ACTIONS.CLONE_CARD) {
        onDuplicateCard(id);
      } else if (actionId === CARD_ACTIONS.DELETE_CARD) {
        onRemoveCard(id);
      } else if (actionId === CARD_ACTIONS.ON_CARD_CHANGE) {
        handleOnCardChange(update(cardConfig, payload));
      }
    },
    tabIndex: 0,
    onKeyDown: (e) => handleKeyDown(e, onSelectCard, cardConfig.id),
    onClick: () => handleOnClick(onSelectCard, cardConfig.id),
    className: `${baseClassName}--preview__card`,
    isSelected,
  });

  return isLoading ? (
    <SkeletonText width="30%" />
  ) : (
    <div className={baseClassName}>
      <div
        className={classnames(`${baseClassName}--content`, {
          // enables overflow: auto if a specific breakpoint is selected so the width can be managed
          [`${baseClassName}__overflow`]:
            selectedBreakpointIndex !== LAYOUTS.FIT_TO_SCREEN.index,
        })}>
        {renderHeader ? (
          renderHeader()
        ) : (
          <DashboardEditorHeader
            title={title}
            breadcrumbs={headerBreadcrumbs}
            onEditTitle={onEditTitle}
            onImport={onImport}
            onExport={() => onExport(dashboardJson)}
            onDelete={onDelete}
            onCancel={onCancel}
            onSubmit={onSubmit}
            submitDisabled={submitDisabled}
            i18n={mergedI18n}
            dashboardJson={dashboardJson}
            selectedBreakpointIndex={selectedBreakpointIndex}
            setSelectedBreakpointIndex={setSelectedBreakpointIndex}
            breakpointSwitcher={breakpointSwitcher}
          />
        )}
        {notification}
        <div
          className={classnames(`${baseClassName}--preview`, {
            // enables overflow: auto if a specific breakpoint is selected so the width can be managed
            [`${baseClassName}__overflow`]:
              selectedBreakpointIndex !== LAYOUTS.FIT_TO_SCREEN.index,
          })}>
          <div
            className={classnames({
              [`${baseClassName}--preview__outline`]:
                selectedBreakpointIndex !== LAYOUTS.FIT_TO_SCREEN.index,
              [`${baseClassName}--preview__md`]:
                selectedBreakpointIndex === LAYOUTS.MEDIUM.index,
              [`${baseClassName}--preview__lg`]:
                selectedBreakpointIndex === LAYOUTS.LARGE.index,
              [`${baseClassName}--preview__xl`]:
                selectedBreakpointIndex === LAYOUTS.XLARGE.index,
            })}>
            {breakpointSwitcher?.enabled &&
              // only show breakpoint info if fit to screen is not selected
              selectedBreakpointIndex !== LAYOUTS.FIT_TO_SCREEN.index && (
                <div className={`${baseClassName}--preview__breakpoint-info`}>
                  {renderBreakpointInfo(currentBreakpoint, mergedI18n)}
                </div>
              )}
            <div className={`${baseClassName}--preview__grid-container`}>
              <ErrorBoundary
                fallback={
                  <InlineNotification
                    title="Dashboard editor error"
                    subtitle="Something went wrong. Please refresh the page."
                    kind="error"
                    lowContrast
                  />
                }>
                <DashboardGrid
                  isEditable
                  breakpoint={currentBreakpoint}
                  onBreakpointChange={(newBreakpoint) => {
                    setCurrentBreakpoint(newBreakpoint);
                  }}
                  layouts={dashboardJson.layouts}
                  onLayoutChange={(newLayout, newLayouts) => {
                    if (onLayoutChange) {
                      onLayoutChange(newLayout, newLayouts);
                    }
                    setDashboardJson({
                      ...dashboardJson,
                      layouts: newLayouts,
                    });
                  }}
                  supportedLayouts={['xl', 'lg', 'md']}>
                  {dashboardJson.cards.map((cardConfig) => {
                    const isSelected = cardConfig.id === selectedCardId;
                    const cardProps = commonCardProps(cardConfig, isSelected);
                    // if renderCardPreview function not defined, or it returns null, render default preview
                    return (
                      renderCardPreview(
                        cardConfig,
                        cardProps,
                        onSelectCard,
                        onDuplicateCard,
                        onRemoveCard,
                        isSelected
                      ) ?? getCardPreview(cardConfig, cardProps)
                    );
                  })}
                </DashboardGrid>
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
      <div className={`${baseClassName}--sidebar`}>
        <ErrorBoundary
          fallback={
            <InlineNotification
              title="Dashboard editor error"
              subtitle="Something went wrong. Please refresh the page."
              kind="error"
              lowContrast
            />
          }>
          <CardEditor
            cardConfig={dashboardJson.cards.find(
              (card) => card.id === selectedCardId
            )}
            onShowGallery={() => setSelectedCardId(null)}
            onChange={handleOnCardChange}
            getValidDataItems={getValidDataItems}
            getValidTimeRanges={getValidTimeRanges}
            dataItems={dataItems}
            onAddCard={addCard}
            onValidateCardJson={onValidateCardJson}
            supportedCardTypes={supportedCardTypes}
            i18n={mergedI18n}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};

DashboardEditor.propTypes = propTypes;
DashboardEditor.defaultProps = defaultProps;

export default DashboardEditor;
