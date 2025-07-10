userifo:
query{
  user {
      labels {
      id
      labelName
      
    }
    id
    login
    firstName
    lastName
    email
    campus

    avatarUrl
    profile
  
  }
}

xp :
query {
    transaction(where: { type: { _eq: "xp" } }) {
        amount
        createdAt
        userLogin
        path
    }
}


ratio :
query{
  user{
    id
    auditRatio
    totalUp
    totalDown

    }  
}

skills:
query {
  skillTransactions: transaction(
    where: { type: { _like: "skill_%" } }
    distinct_on: type
    order_by: { type: desc, amount: desc }
  ) {
    type
    amount
  } 
}


