import React, { Component } from 'react';

import { translate } from '../localization/localize.js';
import { ActionButton } from '../components/Buttons.js';
import LogViewer from '../components/LogViewer.js';
import BaseWizardPage from './BaseWizardPage.js';

const STEPS = [
  translate('deploy.progress.step1'),
  translate('deploy.progress.step2'),
  translate('deploy.progress.step3'),
  translate('deploy.progress.step4'),
  translate('deploy.progress.step5'),
  translate('deploy.progress.step6'),
  translate('deploy.progress.step7')
];

class Progress extends BaseWizardPage {
  constructor() {
    super();
    this.state = {
      deployComplete: false,
      currentStep: 0,
      currentProgress: -1,
      errorMsg: '',
      showLog: false,
      playId: ''
    };

    this.startPlaybook()
  }

  setNextButtonDisabled() {
    return !this.state.deployComplete;
  }

  getError() {
    return (this.state.errorMsg) ? (
      <div>{translate('deploy.progress.failure', STEPS[this.state.currentStep])}<br/>
        <pre className='log'>{this.state.errorMsg}</pre></div>) : (<div></div>);
  }

  getProgress() {
    return STEPS.map((step, index) => {
      var status = '';
      if (this.state.currentProgress >= index) {
        if (this.state.currentProgress >= 13 && index == 6) {
          status = (this.state.currentProgress == 13) ? 'fail' : 'succeed';
        } else {
          if (Math.floor(this.state.currentProgress/2) == index) {
            if (this.state.currentProgress%2 == 0) {
              status = 'progressing';
            } else {
              status = 'succeed';
            }
          } else if (Math.floor(this.state.currentProgress/2) > index) {
            status = 'succeed';
          }
        }
      }
      return (<li key={index} className={status}>{step}</li>);
    });
  }

  progressing() {
    // TODO get real log file from backend
    // fake the steps through progress button for now
    var now = this.state.currentProgress + 1;
    this.setState({currentProgress: now, currentStep: Math.floor(this.state.currentProgress/2)});
    if (this.state.currentProgress == 12) {
      this.setState({errorMsg: 'something is wrong here, please do something'});
    }
    if (this.state.currentProgress == 13) {
      this.setState({errorMsg: '', deployComplete: true});
    }
  }

  startPlaybook() {
   fetch('http://localhost:8081/api/v1/clm/playbooks/site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('')
    })
    .then(response => {
      if (! response.ok) {
        throw (response.statusText);
      } else {
        return response.json();
      }})
    .then(response => {
      this.setState({playId: response['id']})
    });
  }

  renderLogButton() {
    const logButtonLabel = this.state.showLog ? 'Hide Log' : 'Show Log';

    if (this.state.playId) {
      return (
          <ActionButton
            displayLabel={logButtonLabel}
            clickAction={() => this.setState((prev) => { return {"showLog": !prev.showLog} }) } />
      );
    }
  }


  render() {
    return (
      <div className='wizard-content'>
        {this.renderHeading(translate('deploy.progress.heading'))}
        <div className='deploy-progress'>
          <div className='progress-body'>
            <div className='col-xs-4'>
              <ul>{this.getProgress()}</ul>
              <div>
                <ActionButton
                  displayLabel='Progress'
                  hasNext
                  clickAction={() => this.progressing()}/>
                {this.renderLogButton()}
              </div>
            </div>
            <div className='col-xs-8'>
              {this.state.showLog ? <LogViewer playId={this.state.playId} /> : ''}
            </div>
          </div>
        </div>
        {this.renderNavButtons()}
      </div>
    );
  }
}

class CloudDeployProgress extends Component {
  render() {
    // TODO take out the back button when dev mode implementation is ready
    // return (<Progress next={this.props.next}/>);
    return (<Progress back={this.props.back} next={this.props.next}/>);
  }
}

export default CloudDeployProgress;
