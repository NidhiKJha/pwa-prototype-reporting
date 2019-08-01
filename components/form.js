import React from 'react';
const baseUrl=process.env.baseUrl;
const formId = process.env.formId;

export default class Form extends React.Component {
    constructor() {
        super();
        this.state = {
            token: {
                accessToken: '',
                expiresIn: 0,
                refreshToken: '',
                tokenType: ''
            },
            formFields: [],
            formData: {}
        };
    }

    // Make state targets equal to the value of input fields
    change = e => {
        this.setState({
            formData: {
                ...this.state.formData,
                [e.target.name]: e.target.value
            }
        });
    };

    isTokenValid() {
        let isValid = false;
        const currentTime = new Date().getTime();
        const tokenFetchTime = this.state.token.fetching_time;
        const expirationTime = this.state.token.expires_in;
        if (currentTime < tokenFetchTime + expirationTime) {
            isValid = true;
        }
        return isValid;
    }

    getToken() {
        let token = JSON.parse(localStorage.getItem('Bearer Token'));
        if (!token || this.isTokenValid()) {
            fetch(baseUrl + '/oauth/token', {
                method: 'POST',
                body: JSON.stringify({
                    'scope': 'posts country_codes media forms api tags savedsearches sets users stats layers config messages notifications webhooks contacts permissions csv',
                    'client_secret': '35e7f0bca957836d05ca0492211b0ac707671261',
                    'client_id': 'ushahidiui',
                    // no need for a user and password for the moment, 
                    // post as an anonymous user with a client_credentials grant
                    'grant_type': 'client_credentials',
                }),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    } else {
                        throw new Error('Token fetching response is not ok.');
                    }
                })
                .then(data =>
                    this.setState({
                        token: { ...data, fetching_time: new Date().getTime() }
                    })
                )
                .catch(error => console.log(error));
        } else {
            this.setState({ token: token });
        }
    }

    getFormFields() {
        fetch(
            `${baseUrl}/api/v3/forms/${formId}/attributes?order=asc&orderby=priority`
        )
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Field fetching response is not ok.');
            }
        })
        .then(data =>
            this.setState({
                formFields: data.results
            })
        )
        .catch(err => console.log(err));
    }

    componentDidMount() {
        this.getFormFields();
        this.getToken();
    }

    // Handler html For when the submit button is pressed
    onSubmit = e => {
        e.preventDefault();
        // Make a post request to Ushahidi sever
        const values = {};
        Object.keys(this.state.formData).forEach((key) => {
            if (key !== 'title' && key !=='description') {
                values[key] = this.state.formData[key];
            }
        })
        let postData = {
          "title": this.state.formData.title,
          "content":this.state.formData.description,
          "values": values,
          "form":{
            "id": formId
          }
        }
  
        fetch(baseUrl + '/api/v3/posts', {
            method: 'POST',
            body: JSON.stringify(postData),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.state.token.access_token}`
            }
        })
            .then(response => {
                return response.json();
            })
            .then(data => {
                console.log(`Success!!! \n ${data}`);
            })
            .catch(error => {
                console.log(error);
            });

        this.setState({
            formData: {}
        });
    };

    // Create an array of elements to be rendered in the form
    FormInputs = props => {
        return props.fields.map(field => {
            return (
                <div key={field.key}>
                    <label htmlFor={field.label}> {field.label} </label>
                    <input
                        type={field.input}
                        name={field.type !== 'title' && field.type !== 'description'? field.key : field.type}
                        placeholder={`Enter the ${field.label}`}
                        value={this.state.formData[field.label]}
                        onChange={e => this.change(e)}
                    />
                </div>
            );
        });
    };

    render() {
        return (
            <form>
                <this.FormInputs fields={this.state.formFields} />
                <div>
                    <button onClick={e => this.onSubmit(e)}>Submit</button>
                </div>
            </form>
        );
    }
}
