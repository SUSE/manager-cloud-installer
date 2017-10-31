// (c) Copyright 2017 SUSE LLC
import React, { Component } from 'react';
import { fromJS } from 'immutable';
import { translate } from '../../localization/localize.js';
import { ServerInputLine, ServerDropdownLine } from '../../components/ServerUtils.js';
import { ActionButton } from '../../components/Buttons.js';
import { alphabetically } from '../../utils/Sort.js';
import {
  IpV4AddressValidator, VLANIDValidator, CidrValidator, UniqueNameValidator
} from '../../utils/InputValidators.js';
import { MODE, INPUT_STATUS } from '../../utils/constants.js';

class UpdateNetworks extends Component {
  constructor(props) {
    super(props);
    this.networkGroups = this.getNetworkGroups();
    this.data = this.props.mode === MODE.EDIT ? this.getNetworkData(this.props.networkName) : {};
    this.allInputsStatus = {
      'name': INPUT_STATUS.UNKNOWN,
      'vlanid': INPUT_STATUS.UNKNOWN,
      'cidr': INPUT_STATUS.UNKNOWN,
      'gateway-ip': INPUT_STATUS.UNKNOWN
    };

    this.state = {
      isFormValid: false,
      isTaggedChecked:
        this.data['tagged-vlan'] !== '' && this.data['tagged-vlan'] !== undefined ?  this.data['tagged-vlan'] : false,
    };
  }

  getNetworkData(name) {
    let network =
      this.props.model.getIn(['inputModel','networks']).find(net => net.get('name') === name);
    return JSON.parse(JSON.stringify(network));
  }

  isFormTextInputValid() {
    let isAllValid = true;
    let values = Object.values(this.allInputsStatus);
    isAllValid =
      (values.every((val) => {return val === INPUT_STATUS.VALID || val === INPUT_STATUS.UNKNOWN;})) &&
      this.allInputsStatus['name'] !== INPUT_STATUS.UNKNOWN;

    return isAllValid;
  }

  isFormDropdownValid() {
    let isValid = true;
    if(this.data['network-group'] === '' || this.data['network-group'] === undefined) {
      isValid = false;
    }
    return isValid;
  }

  updateFormValidity = (props, isValid) => {
    this.allInputsStatus[props.inputName] = isValid ? INPUT_STATUS.VALID : INPUT_STATUS.INVALID;
    this.setState({isFormValid: this.isFormTextInputValid() && this.isFormDropdownValid()});
  }

  handleSelectNetworkGroup = (groupName) => {
    this.data['network-group'] = groupName;
    this.setState({isFormValid: this.isFormTextInputValid() && this.isFormDropdownValid()});
  }

  handleInputChange = (e, isValid, props) => {
    let value = e.target.value;
    this.updateFormValidity(props, isValid);
    if (isValid) {
      this.data[props.inputName] = value;
    }
  }

  handleUpdateNetwork = () => {
    let model = this.props.model;
    if(this.props.mode === MODE.ADD) {
      model = model.updateIn(
        ['inputModel', 'networks'], net => net.push(fromJS(this.data)));
      this.props.updateGlobalState('model', model);
    }
    else {
      let idx = model.getIn(['inputModel','networks']).findIndex(
        net => net.get('name') === this.props.networkName);
      model = model.updateIn(['inputModel', 'networks'],
        net => net.splice(idx, 1, fromJS(this.data)));
      this.props.updateGlobalState('model', model);
    }
    this.props.closeAction();
  }

  handleTaggedVLANChange = () => {
    this.data['tagged-vlan'] = !this.state.isTaggedChecked;
    this.setState({isTaggedChecked: !this.state.isTaggedChecked});
  }

  getNetworkGroups = () => {
    return this.props.model.getIn(['inputModel','network-groups']).map(e => e.get('name'))
      .toJS()
      .sort(alphabetically);
  }

  renderNetworkInput(name, type, isRequired, placeholderText, validate) {
    let theProps = {};
    //for vlanid
    if(type === 'number') {
      theProps.min = 1;
      theProps.max = 4094;
    }

    if(name === 'name') {
      theProps.names =
        this.props.model.getIn(['inputModel','networks']).map(e => e.get('name'))
          .toJS();
      if(this.props.mode === MODE.EDIT) {
        //remove current name so won't check against it
        let idx = this.props.model.getIn(['inputModel','networks']).findIndex(
          net => net.get('name') === this.props.networkName);
        theProps.names.splice(idx, 1);
      }
      theProps.check_nospace=true;
    }

    return (
      <ServerInputLine
        isRequired={isRequired} inputName={name} inputType={type}
        placeholder={placeholderText} inputValidate={validate}
        inputValue={this.props.mode === MODE.EDIT ? this.data[name] : ''} {...theProps}
        inputAction={this.handleInputChange}/>
    );
  }

  renderNetworkGroup() {
    let emptyOptProps = '';
    if(this.data['network-group'] === '' || this.data['network-group'] === undefined) {
      emptyOptProps = {
        label: translate('network.group.please.select'),
        value: 'noopt'
      };
    }
    return (
      <ServerDropdownLine value={this.data['network-group']}
        optionList={this.networkGroups} isRequired={true}
        emptyOption={emptyOptProps} selectAction={this.handleSelectNetworkGroup}/>
    );
  }

  renderTaggedVLAN() {
    return (
      <div className='tagged-vlan'>
        <input className='tagged' type='checkbox' value='taggedvlan'
          checked={this.state.isTaggedChecked} onChange={this.handleTaggedVLANChange}/>
        {translate('tagged-vlan')}
      </div>
    );
  }
  render() {
    let title =
      this.props.mode === MODE.EDIT ? translate('network.update') : translate('network.add');
    return (
      <div className='details-section network-section'>
        <div className='details-header'>{title}</div>
        <div className='details-body'>
          {this.renderNetworkInput('name', 'text', true, translate('network.name') + '*', UniqueNameValidator)}
          {this.renderNetworkInput('vlanid', 'number', false, translate('vlanid'), VLANIDValidator)}
          {this.renderNetworkInput('cidr', 'text', false, translate('cidr'), CidrValidator)}
          {this.renderNetworkInput('gateway-ip', 'text', false, translate('network.gateway'), IpV4AddressValidator)}
          {this.renderNetworkGroup()}
          {this.renderTaggedVLAN()}
          <div className='btn-row details-btn network-more-width'>
            <div className='btn-container'>
              <ActionButton key='networkCancel' type='default' clickAction={this.props.closeAction}
                displayLabel={translate('cancel')}/>
              <ActionButton key='networkSave' clickAction={this.handleUpdateNetwork}
                displayLabel={translate('save')} isDisabled={!this.state.isFormValid}/>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default UpdateNetworks;
