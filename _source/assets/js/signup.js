$(function () {

    var email_regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        is_processing = false,
        has_tried = false,
        form_valid = false,
        pass_blacklist = false,
        one_checked = false,
        signup_form = '#developer_signup',
        api_url = 'https://oktastg.prod.acquia-sites.com/developerapi';

    // Update form location information
    if (typeof geoip2 != 'undefined'){
        var geo_error = function(error) {
            return;
        };
        var geo_success = function(geoipResponse) {
            $(signup_form + ' #Country').val(geoipResponse.country.names.en);
            if (geoipResponse.subdivisions[0] != '') {
                $(signup_form + ' #State').val(geoipResponse.subdivisions[0].names.en);
                $(signup_form + ' #Province').val(geoipResponse.subdivisions[0].names.en);
            }

            // show opt-in for non US registrations
            if (geoipResponse.country.names.en == 'Canada') {
                $(signup_form + ' .casl-inputs').show();
            }
        };
        geoip2.city(geo_success, geo_error);
    }

    // Update form source
    $(signup_form + ' .request_source').val(window.location.href);

    // Update form ip address
    $.ajax({
        url: api_url + '/ip_address/',
        method: 'get'
    })
    .done(function(resp) {
        $(signup_form + ' .request_ip').val(resp.ip_address.toString());
    });

    // process form submission
    $(signup_form).submit(function(e){
        e.preventDefault;
        has_tried = true;

        if (! is_processing) {
            form_processing(true);

            form_valid = true;

            // validate form
            $(signup_form + ' .required').each(function(){
                validate_input($(this));
            });

            if (form_valid) {
                // update submission timestamp
                $(signup_form + ' #CASL_Time_Stamp__c').val(Date.now());

                // get email blacklist status
                $.ajax({
                    url: api_url + '/blacklist/',
                    cache: false,
                    method: 'get',
                    data: $(signup_form + ' #email').serializeArray()
                })
                .done(function(resp) {
                    pass_blacklist = resp.status;
                })
                .always(function(resp){
                    if (pass_blacklist) {
                        $.ajax({
                            url: api_url + '/create/',
                            cache: false,
                            method: 'get',
                            data: $(signup_form).serializeArray()
                        })
                        .done(function(resp) {
                            var url = window.location.toString(),
                                thank_you_url = window.location.protocol.toString().concat('//', window.location.host, window.location.pathname, 'thank-you/');

                            // preserve query string
                            if (url.indexOf('?') > 0) {
                                thank_you_url = thank_you_url.concat(url.substr(url.indexOf('?'), url.length));
                            }
                            // preserve hash
                            else if (window.location.hash != '') {
                                thank_you_url = thank_you_url.concat(window.location.hash.toString());
                            }

                            localStorage.setItem('generated_domain',resp.responseJSON.org_domain);
                            window.location.href = thank_you_url;
                        })
                        .fail(function(resp) {
                            // if response has error message display it
                            if (resp.responseJSON.error_message != 'undefined') {
                                $(signup_form + ' .global-error').html(resp.responseJSON.error_message.toString()).show();
                            }

                            // if response has invalid inputs highlight them
                            if (resp.responseJSON.invalid_inputs != 'undefined') {
                                $(signup_form + ' :input').each(function(){
                                    if ($.inArray($(this).attr('name'), resp.responseJSON.invalid_inputs) >= 0) {
                                        $(this).parent('div').removeClass('is-valid')
                                        $(this).parent('div').addClass('is-invalid')
                                    }
                                });
                            }
                        })
                        .always(function(resp){
                            form_processing(false);
                        });
                    }
                    else {
                        $('#developer_signup').hide();
                        $('#developer_error').show();
                    }
                });
            }
            else {
                form_processing(false);
            }
        }

        return false;
    });

    // validate changes as they're made after a submission attempt
    $(signup_form + ' .required').keyup(function(){
        if (has_tried) {
            validate_input($(this));
        }
    });

    // update opt in based on selection
    $(signup_form + ' .casl_optin :input').on('click', function(){
        if ($(this).val() == 'yes') {
            $('#Communication_Opt_in__c').val('true');
            $('#Communication_Opt_out__c').val('false');
        }
        else {
            $('#Communication_Opt_in__c').val('false');
            $('#Communication_Opt_out__c').val('true');
        }
    });

    /**
     * Change form processing state, when processing submission requests not processed and
     * submit button text changes to spinner graphic
     *
     * @param status            boolean form processing status
     */
    function form_processing(status) {
        if (status) {
            is_processing = true;
            $('.OccForm-submit').addClass('is-processing');
        }
        else {
            is_processing = false;
            $('.OccForm-submit').removeClass('is-processing');
        }
    }

    /**
     * Validate provided input value, updates parent div styles based on value provided
     *
     * @param which             form input element
     */
    function validate_input(which) {
        which.closest('div').removeClass('is-valid');

        // field missing value
        if (which.val() == '') {
            form_valid = false;
            which.closest('div').addClass('is-invalid');
        }
        // email field has invalid address format
        else if (which.hasClass('valid-email') && ! email_regex.test(which.val())) {
            form_valid = false;
            which.closest('div').addClass('is-invalid');
        }
        // if visible make sure one communication preference is selected
        else if (which.hasClass('valid-radio')){
            if (which.is(':checked') || !which.is(':visible')) {
                one_checked = true;
            }
            // apply results to both options
            if (!one_checked) {
                form_valid = false;
                which.closest('div').addClass('is-invalid');
            }
            else {
                which.closest('div').removeClass('is-invalid');
                which.closest('div').addClass('is-valid');
            }
        }
        // input appears valid
        else {
            which.closest('div').removeClass('is-invalid');
            which.closest('div').addClass('is-valid');
        }
    }

    // thank you page output
    var generated_domain = localStorage.getItem('generated_domain');
    if (generated_domain != null) {
        $('#domain_link').html('<p>Access your new developer account now by visiting <a href="https://' + generated_domain + '.okta.com">' + generated_domain + '.okta.com</a></p>');
    }
});
