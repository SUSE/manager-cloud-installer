import React, { Component } from 'react';

import { translate } from '../localization/localize.js';
import { ActionButton } from '../components/Buttons.js';
import LogViewer from '../components/LogViewer.js';
import BaseWizardPage from './BaseWizardPage.js';
import io from 'socket.io-client';

const STEPS = [
  {
    label: translate('deploy.progress.step1'),
    playbooks: ['network_interface-deploy.yml']
  },
  {
    label: translate('deploy.progress.step2'),
    playbooks: ['nova-deploy.yml', 'ironic-deploy.yml', 'magnum-deploy.yml']
  },
  {
    label: translate('deploy.progress.step3'),
    playbooks: ['monasca-agent-deploy.yml', 'monasca-deploy.yml', 'monasca-transform-deploy.yml']
  },
  {
    label: translate('deploy.progress.step4'),
    playbooks: ['ceph-deploy.yml', 'cinder-deploy.yml', 'swift-deploy.yml']
  },
  {
    label: translate('deploy.progress.step5'),
    playbooks: ['hlm-status.yml']
  },
  {
    label: translate('deploy.progress.step6'),
    playbooks: ['site.yml']
  }
];

class Progress extends BaseWizardPage {
  constructor() {
    super();
    this.state = {
      deployComplete: false,
      errorMsg: '',
      showLog: false,
      playId: '',
      playbooksStarted: [],
      playbooksComplete: [],
      playbooksError: []
    };

    let connectionId = (Math.round(Math.random() * (100000))) + ''; //random number between 0-100000 as a string
    this.socket = io('http://localhost:8081');
    this.socket.on('playbook-start', this.playbookStarted.bind(this));
    this.socket.on('playbook-stop', this.playbookStopped.bind(this));
    this.socket.on('playbook-error', this.playbookError.bind(this));
    this.socket.on('connect', function() {
      this.socket.emit('ardanasocketproxy', connectionId, 'listener', 'deployprogress');
    }.bind(this));
    
    this.startPlaybook()
  }

  setNextButtonDisabled() {
    return ((this.state.playbooksComplete.indexOf('site.yml') === -1) ||
            (this.state.playbooksError.length !== 0));
  }

  //TODO - evaluate if we can get error messages from the playbooks and propagate them here
  getError() {
    return (this.state.errorMsg) ? (
      <div>{translate('deploy.progress.failure')}<br/>
        <pre className='log'>{this.state.errorMsg}</pre></div>) : (<div></div>);
  }

  getProgress() {
    return STEPS.map((step, index) => {
      var status = '', i = 0;

      //for each step, check if all needed playbooks are done
      //if any are not done, check if at least 1 has started
      for(i = 0; i < step.playbooks.length; i++) {
        if(this.state.playbooksError.indexOf(step.playbooks[i]) !== -1) {
          status = 'fail';
          break;//theres at least 1 ERROR playbook
        }

        if(this.state.playbooksComplete.indexOf(step.playbooks[i]) === -1) {
          break;//theres at least 1 incomplete playbook
        }

        if(i === (step.playbooks.length - 1)) {
          status = 'succeed';
          break;
        }
      }

      //status was not set in the "completed" loop
      if(status === '') {
        for(i = 0; i < step.playbooks.length; i++) {
          if (this.state.playbooksStarted.indexOf(step.playbooks[i]) !== -1) {
            status = 'progressing';//theres at least 1 started playbook
          }
        }
      }

      return (<li key={index} className={status}>{step.label}</li>);
    });
  }

  /**
   * this function and its follow-on exist just to test out the progress functionality
   */
  progressing() {
    // fake the steps through progress button for now
    let allPlaybooks = [
      'network_interface-deploy.yml',
      'nova-deploy.yml', 'ironic-deploy.yml', 'magnum-deploy.yml',
      'monasca-agent-deploy.yml', 'monasca-deploy.yml', 'monasca-transform-deploy.yml',
      'ceph-deploy.yml', 'cinder-deploy.yml', 'swift-deploy.yml',
      'hlm-status.yml',
      'site.yml'
    ];

    this.progressNext.bind(this)(allPlaybooks, 0);

  }

  /**
   * recursively called function to fake playbook progress for dev/test purposes
   */
  progressNext(allPlaybooks, index) {
    var limit = (allPlaybooks.length * 2);
    if(index === limit) {
      return;
    } else if(index === 0 || index % 2 === 0) {
      this.playbookStarted(allPlaybooks[(index / 2)]);
    } else {
      this.playbookStopped(allPlaybooks[Math.floor(index / 2)]);
    }

    var callNext = this.progressNext.bind(this);
    setTimeout(function() {
      callNext(allPlaybooks, index + 1);
    }, 1000);
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
            <div className='col-xs-6'>
              <ul>{this.getProgress()}</ul>
            </div>
            <div className='col-xs-6'>
              {this.state.showLog ? <LogViewer playId={this.state.playId} /> : ''}
            </div>
          </div>
        </div>
        <div>
          <ActionButton
            displayLabel='Progress'
            hasNext
            clickAction={() => this.progressing()}/>
          {this.renderLogButton()}
        </div>
        {this.renderNavButtons()}
      </div>
    );
  }

  /**
   * callback for when a playbook starts, the UI component will track which
   * playbooks out of the needed set have started/finished to show status
   * to the user
   * @param {String} the playbook filename
   */
  playbookStarted(playbook) {
    let playbooksStarted = this.state.playbooksStarted;
    playbooksStarted.push(playbook);
    this.setState({'playbooksStarted' : playbooksStarted});
  }

  /**
   * callback for when a playbook finishes, the UI component will track which
   * playbooks out of the needed set have started/finished to show status
   * to the user
   * @param {String} the playbook filename
   */
  playbookStopped(playbook) {
    let playbooksComplete = this.state.playbooksComplete;
    playbooksComplete.push(playbook);
    this.setState({'playbooksComplete' : playbooksComplete});
  }

  /**
   * callback for when a playbook finishes, the UI component will track which
   * playbooks out of the needed set have started/finished to show status
   * to the user
   * @param {String} the playbook filename
   */
  playbookError(playbook) {
    console.log('playbook error:!' + playbook);
    let playbooksError = this.state.playbooksError;
    playbooksError.push(playbook);
    this.setState({'playbooksError' : playbooksError});
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
