'use strict';
(function() {

    class ApplicationComponent {
        constructor($http, $scope, $state, jurisdictions, applications, contacts) {
            this.$scope = $scope;
            this.jurisdictions = jurisdictions;
            this.$state = $state;
            this.applications = applications;
            this.contacts = contacts;
            this.applicationId;
            this.application = {};
            // this.jurisdiction = {};
            // this.names = [];
            //Datepicker

            function disabled(data) {
                var date = data.date,
                    mode = data.mode;
                return mode === 'day' && (date.getDay() === 0 || date.getDay() === 6);
            }

            $scope.dateOptions = {
                dateDisabled: disabled,
                formatYear: 'yy',
                maxDate: new Date(2020, 5, 22),
                minDate: new Date(),
                startingDay: 1
            };

            $scope.open1 = function() {
                $scope.popup1.opened = true;
            };

            $scope.popup1 = {
                opened: false
            };

            $scope.popup2 = {
                opened: false
            };
            $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
            $scope.format = $scope.formats[0];
            $scope.altInputFormats = ['M!/d!/yyyy'];
            //End datepicker

        }

        $onInit() {

            //Datepicker
            // Disable weekend selection

            //Load list of jurisdictions for drop down list
            this.jurisdictions.getJurisdictions().then(response => {
                this.names = response.data;

            });
            console.log(this.applications.getId());
            //Load the current jurisdiction if one exists
            if (this.applications.getId()) {
                this.applicationId = this.applications.getId();
            } else {
                this.$state.go('main');
            }
            this.applications.getCurrent(this.applicationId)
                .then(response => {
                    this.application = response.data;
                    this.application = response.data;
                    console.log(response.data.lastMajorInspection);
                    this.application.lastMajorInspection = new Date(response.data.lastMajorInspection);

                    console.log(this.application);
                    this.contact1Id = this.application.primaryContactId;
                    this.contact2Id = this.application.streetSaverContactId;
                    if (this.contact1Id) {
                        this.$scope.contact1Exists = true;
                    } else {
                        this.$scope.contact1Exists = false;
                    }
                    if (this.contact2Id) {
                        this.$scope.contact2Exists = true;
                    } else {
                        this.$scope.contact2Exists = false;
                    }
                    this.contact2Id = this.application.streetSaverContactId;
                    var id = this.application.jurisdictionId;
                    console.log(id);
                    return this.jurisdictions.getJurisdiction(id);

                }).then(response => {
                    console.log(response.data);
                    this.jurisdiction = response.data;
                    //Calculate field 
                    console.log(calculateMiles(this.jurisdiction.laneMiles));
                    var newValues = calculateMiles(this.jurisdiction.laneMiles);
                    this.application.networkMilesRemaining = newValues.networkMilesRemaining;
                    this.application.networkMilesForSurvey = newValues.networkMilesForSurvey;
                    this.application.networkSurveyPercent = newValues.networkSurveyPercent;

                    //Set global variable for network miles remaining
                    console.log('setting netowrk miles remainig', this.application.networkMilesRemaining);
                    this.applications.setNetworkMilesRemaining(this.application.networkMilesRemaining);

                    //Find primary contact
                    return this.contacts.getOne(this.contact1Id);
                }).then(response => {
                    console.log(response.data);
                    this.contact1 = response.data;
                    //Find streetsaver contact
                    return this.contacts.getOne(this.contact2Id);
                }).then(response => {
                    console.log(response.data);
                    this.contact2 = response.data;
                });
            console.log(this.applicationId, ' is the application id');

            /**
             * [calculateMiles Returns values for remaining miles, miles for survey and percent of network surveyed]
             * @param  {[type]} laneMiles [Total centerline miles of the jurisdiction]
             * @return {[type]}           [Returns object with values]
             */
            function calculateMiles(laneMiles) {
                var calculatedValues = {};
                var remaining;
                var survey;
                var percent;

                if (laneMiles >= 333.33) {
                    remaining = laneMiles - 333.33;
                    survey = 333.33;
                    percent = 100 * (_.divide(333.33, laneMiles));
                } else if (laneMiles < 333.33) {
                    remaining = 0;
                    survey = laneMiles;
                    percent = 100;
                }

                calculatedValues = {
                    networkMilesRemaining: remaining,
                    networkMilesForSurvey: survey,
                    networkSurveyPercent: percent
                };
                return calculatedValues;

            }

        }

        retrieveApplication() {
            this.applications.getCurrent(this.applicationId).then(response => {
                this.application = response.data;
                console.log(this.application);
            });
        }

        reviewSection1() {
            this.jurisdiction.jurisdictionId = this.jurisdiction._id;
            console.log(this.jurisdiction);
            var id = this.jurisdiction._id;
            var data = this.jurisdiction;
            this.jurisdictions.update(id, data).then(response => {
                console.log(response);
                var appId = this.applications.getId();
                var appData = {
                    applicationId: appId,
                    jurisdictionId: response.data._id
                };
                console.log(appData);
                this.applications.update(appId, appData).then(info => {
                    console.log(info);
                    this.$state.go('application.form-2');
                }).catch(function(error) {
                    console.log(error);
                });
            }).catch(function(err) {
                console.log(err);
                throw err;
            });

        }

        reviewSection2() {
            console.log(this.contact1);
            console.log(this.$scope.contact1Exists);

            if (this.$scope.contact1Exists) {
                this.$state.go('application.form-2b');
            } else if (!this.$scope.contact1Exists) {
                this.contacts.create(this.contact1).then(response => {
                    console.log(response);
                    this.contacts.setCurrent(response.data);
                    var appId = this.applications.getId();
                    var appData = {
                        primaryContactId: response.data.contactId
                    };
                    console.log(appData);
                    this.applications.update(appId, appData).then(info => {
                        console.log(info);
                        this.$state.go('application.form-2b');
                    }).catch(function(error) {
                        console.log(error);
                    });
                }).catch(function(error) {
                    console.log(error);
                    throw error;
                });
            }

        }

        checkSameContact() {
            console.log(this.contact2.check);
            if (this.contact2.check) {
                var contact = this.contacts.getCurrent();
                console.log(contact);
                contact.check = true;
                this.contact2 = contact;


            } else {
                this.contact2 = {};
            }

        }

        reviewSection2b() {
            console.log(this.contact2);
            console.log(this.$scope.contact2Exists);
            if (this.$scope.contact2Exists) {
                this.$state.go('application.form-3');
            } else if (!this.$scope.contact2Exists) {
                var appId = this.applications.getId();
                var appData = {
                    streetSaverContactId: this.contact2.contactId
                };
                if (this.contact2.check) {
                    this.applications.update(appId, appData).then(info => {
                        console.log(info);
                        this.$state.go('application.form-3');
                    }).catch(function(error) {
                        console.log(error);
                    });
                } else {
                    this.contacts.create(this.contact2).then(response => {
                        console.log(response);
                        appId = this.applications.getId();
                        appData = {
                            streetSaverContactId: response.data.contactId
                        };
                        console.log(appData);
                        this.applications.update(appId, appData).then(info => {
                            console.log(info);
                            this.$state.go('application.form-3');
                        }).catch(function(error) {
                            console.log(error);
                        });
                    }).catch(function(error) {
                        console.log(error);
                        throw error;
                    });
                }
            }


        }

        reviewSection3() {
            var appId = this.applications.getId();
            var appData = this.application;
            this.applications.update(appId, appData).then(info => {
                console.log(info);
                this.$state.go('application.form-4');
            }).catch(function(error) {
                console.log(error);
            });
            var jurisdiction = this.jurisdictions.getCurrent();
            console.log(jurisdiction);
            this.$state.go('application.form-4');
        }

        reviewSection4() {
            this.$state.go('application.form-5');
        }

        reviewSection5() {
            this.$state.go('application.form-6');
        }

        updateJurisdiction() {
            console.log(this.jurisdiction);
            var id = this.jurisdiction._id;
            this.jurisdictions.getJurisdiction(id).then(response => {
                this.jurisdiction = response.data;
                this.jurisdictions.setCurrent(response.data);
                console.log(this.jurisdiction);
            });
        }

        //Update values on input for network miles that will be surveyed
        updateMilesForSurvey() {
            var laneMiles = _.toNumber(this.jurisdiction.laneMiles);
            console.log(laneMiles);
            if (laneMiles >= 333.33) {
                //Network miles remaining
                this.application.networkMilesRemaining = laneMiles - _.toNumber(this.application.networkMilesForSurvey);
                //Percent of network to be surveyed
                this.application.networkSurveyPercent = (this.application.networkMilesForSurvey / laneMiles) * 100;
            }

        }

        updateAdditionalFunds() { //Update values based on input for additional funds
            var remaining = this.applications.getNetworkMilesRemaining();
            console.log(remaining);
            var additionalMiles = _.divide(this.application.networkAdditionalFunds, 300);
            this.application.networkPercentAdditionalFunds = ((additionalMiles + this.application.networkMilesForSurvey)/this.jurisdiction.laneMiles)*100;
        }


    }

    angular.module('ptapApp')
        .component('application', {
            templateUrl: 'app/account/application/application.html',
            controller: ApplicationComponent,
            controllerAs: 'appCtrl'
        });
    angular.module('ptapApp')
        .controller('ApplicationCtrl', ApplicationComponent);

})();
